import { dirname, join } from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";
import { readFile } from "fs/promises";
import { beLog, beLogErr } from "../utils/beLog";

const require = createRequire(import.meta.url);

const MAX_BYTES = 40 * 1024 * 1024;
const LINE_Y_BUCKET = 4;
const MAX_TITLE_LEN = 280;
const MAX_AUTHOR_LEN = 160;

type TextItemLike = { str?: string; transform?: number[] };

export type PdfPlainTextGuess = {
  title: string | null;
  author: string | null;
};

const pushGlyphRowsFromItems = (items: TextItemLike[], rows: { y: number; x: number; s: string }[]) => {
  for (const it of items) {
    if (!it?.str || !it.transform || it.transform.length < 6) continue;
    const s = it.str;
    if (!s.trim()) continue;
    rows.push({ y: it.transform[5], x: it.transform[4], s });
  }
};

const bucketRowsByY = (rows: { y: number; x: number; s: string }[]) => {
  const byBucket = new Map<number, { x: number; s: string }[]>();
  for (const r of rows) {
    const b = Math.round(r.y / LINE_Y_BUCKET) * LINE_Y_BUCKET;
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b)!.push({ x: r.x, s: r.s });
  }
  return byBucket;
};

const sortedLinesFromYBuckets = (byBucket: Map<number, { x: number; s: string }[]>) =>
  [...byBucket.keys()]
    .sort((a, b) => b - a)
    .map((k) => {
      const parts = byBucket.get(k)!;
      parts.sort((a, b) => a.x - b.x);
      return parts
        .map((p) => p.s)
        .join("")
        .trim();
    })
    .filter(Boolean);

const buildLinesSortedTopToBottom = (items: TextItemLike[]) => {
  const rows: { y: number; x: number; s: string }[] = [];
  pushGlyphRowsFromItems(items, rows);
  if (rows.length === 0) return [];
  return sortedLinesFromYBuckets(bucketRowsByY(rows));
};

const loadPdfJsDocumentFromBytes = async (pdfBytes: Uint8Array) => {
  const pdfRoot = dirname(require.resolve("pdfjs-dist/package.json"));
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const V = pdfjs as { VerbosityLevel?: { ERRORS: number }; setVerbosityLevel?: (n: number) => void };
  if (typeof V.setVerbosityLevel === "function" && V.VerbosityLevel) V.setVerbosityLevel(V.VerbosityLevel.ERRORS);
  return pdfjs.getDocument({
    data: Uint8Array.from(pdfBytes),
    useSystemFonts: true,
    useWorkerFetch: false,
    verbosity: 0,
    standardFontDataUrl: pathToFileURL(join(pdfRoot, "standard_fonts/")).href,
    cMapUrl: pathToFileURL(join(pdfRoot, "cmaps/")).href,
    cMapPacked: true,
  }).promise;
};

const normalizeSpaces = (s: string) => s.replace(/\s+/g, " ").trim();

const stripTrailingAuthorJunk = (s: string) => s.replace(/[.,;:]+$/g, "").trim();

const looksLikeNoiseLine = (line: string) => {
  const t = line.trim();
  if (t.length < 2) return true;
  if (/^\d{1,4}$/.test(t)) return true;
  if (/https?:\/\//i.test(t)) return true;
  if (/^(copyright|©|all rights reserved|isbn|issn|printed in|published by)\b/i.test(t)) return true;
  if (/^project gutenberg\b/i.test(t)) return true;
  return false;
};

export const inferTitleAuthorFromPdfPlainLines = (lines: string[]): PdfPlainTextGuess => {
  const cleaned = lines.map((l) => normalizeSpaces(l)).filter((l) => l.length > 0 && !looksLikeNoiseLine(l));
  if (cleaned.length === 0) return { title: null, author: null };

  const scanDepth = Math.min(cleaned.length, 24);

  for (let i = 0; i < scanDepth; i++) {
    const line = cleaned[i];
    const inline = /^(.{2,240}?)\s+by\s+(.{2,120})$/i.exec(line);
    if (inline) {
      const title = normalizeSpaces(inline[1]).slice(0, MAX_TITLE_LEN);
      const author = stripTrailingAuthorJunk(normalizeSpaces(inline[2])).slice(0, MAX_AUTHOR_LEN);
      if (title.length >= 2 && author.length >= 2) return { title, author };
    }
  }

  for (let i = 1; i < scanDepth; i++) {
    const m = /^by\s+(.{2,200})$/i.exec(cleaned[i]);
    if (!m) continue;
    const author = stripTrailingAuthorJunk(normalizeSpaces(m[1])).slice(0, MAX_AUTHOR_LEN);
    const titleBlock = cleaned.slice(0, i).filter((l) => !looksLikeNoiseLine(l));
    if (titleBlock.length === 0 || author.length < 2) continue;
    const title = normalizeSpaces(titleBlock.join(" ")).slice(0, MAX_TITLE_LEN);
    if (title.length >= 2) return { title, author };
  }

  return { title: null, author: null };
};

export const guessPdfTitleAuthorFromFirstPageText = async (
  pdfPath: string,
  fileSize: number,
): Promise<PdfPlainTextGuess> => {
  beLog("guessPdfTitleAuthorFromFirstPageText");
  if (fileSize > MAX_BYTES) return { title: null, author: null };
  let doc: Awaited<ReturnType<typeof loadPdfJsDocumentFromBytes>> | null = null;
  try {
    const buf = await readFile(pdfPath);
    doc = await loadPdfJsDocumentFromBytes(buf);
    const page = await doc.getPage(1);
    const tc = await page.getTextContent();
    const lines = buildLinesSortedTopToBottom(tc.items as TextItemLike[]);
    return inferTitleAuthorFromPdfPlainLines(lines);
  } catch (e) {
    beLogErr("guessPdfTitleAuthorFromFirstPageText", e, { path: pdfPath.slice(0, 120) });
    return { title: null, author: null };
  } finally {
    try {
      await doc?.destroy();
    } catch {
      /* ignore */
    }
  }
};
