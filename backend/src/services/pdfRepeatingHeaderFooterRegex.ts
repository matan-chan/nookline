import { createRequire } from "module";
import { dirname, join } from "path";
import { pathToFileURL } from "url";

const require = createRequire(import.meta.url);

export type PdfHeaderFooterRegexResult = {
  regexes: string[];
};

const LINE_Y_BUCKET = 4;
const HEAD_LINE_SLOTS = 14;
const TAIL_LINE_SLOTS = 14;
const PIPE_MARGIN_HEAD_SCAN = 28;
const PIPE_MARGIN_TAIL_SCAN = 28;
const MIN_PAGES_FOR_PATTERN = 3;
const MIN_LINE_HITS = 3;
const MIN_LINE_PAGE_FRACTION = 0.28;

type TextItemLike = { str?: string; transform?: number[] };

type MarginTally = {
  sample: string;
  pages: Set<number>;
  slot: "head" | "tail";
};

const escapeRegexForLiteral = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeForTally = (line: string) => line.trim().replace(/\d+/g, "#");

const uniqNonEmpty = (lines: string[]) => [...new Set(lines.map((x) => x.trim()).filter(Boolean))];

const lineToDigitAwareRegex = (line: string) => {
  const t = line.trim();
  if (!t) return null;
  const parts = t.split(/(\d+)/);
  const body = parts.map((p, i) => (i % 2 === 1 ? "\\d+" : escapeRegexForLiteral(p))).join("");
  return `^(?:${body})\\s*$`;
};

const tallyMarginLine = (tally: Map<string, MarginTally>, slot: "head" | "tail", line: string, pageIndex: number) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  const key = `${slot}:${normalizeForTally(trimmed)}`;
  const prev = tally.get(key);
  if (prev) {
    prev.pages.add(pageIndex);
    return;
  }
  tally.set(key, { sample: trimmed, pages: new Set([pageIndex]), slot });
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

const looksLikeDigitPipeTitleMarginLine = (line: string) => {
  const t = line.trim();
  if (t.length < 6 || t.length > 260) return false;
  return /^\d{1,6}\s*\|\s*\S/.test(t);
};

const looksLikeTitlePipeDigitMarginLine = (line: string) => {
  const t = line.trim();
  if (t.length < 6 || t.length > 260) return false;
  return /\s\|\s*\d{1,6}\s*$/.test(t) && /[A-Za-z]/.test(t);
};

const appendPipeStyleMarginLineTallies = (tally: Map<string, MarginTally>, linesPerPage: string[][]) => {
  linesPerPage.forEach((lines, pageIndex) => {
    if (lines.length === 0) return;
    const headScan = lines.slice(0, Math.min(PIPE_MARGIN_HEAD_SCAN, lines.length));
    const tailScan = lines.slice(Math.max(0, lines.length - PIPE_MARGIN_TAIL_SCAN));
    for (const line of headScan) {
      if (!looksLikeTitlePipeDigitMarginLine(line)) continue;
      tallyMarginLine(tally, "head", line, pageIndex);
    }
    for (const line of tailScan) {
      if (!looksLikeDigitPipeTitleMarginLine(line)) continue;
      tallyMarginLine(tally, "tail", line, pageIndex);
    }
  });
};

const collectMarginTallies = (linesPerPage: string[][]) => {
  const tally = new Map<string, MarginTally>();
  linesPerPage.forEach((lines, pageIndex) => {
    if (lines.length === 0) return;
    const head = lines.slice(0, Math.min(HEAD_LINE_SLOTS, lines.length));
    const tail = lines.slice(Math.max(0, lines.length - TAIL_LINE_SLOTS));
    for (const line of uniqNonEmpty(head)) tallyMarginLine(tally, "head", line, pageIndex);
    for (const line of uniqNonEmpty(tail)) tallyMarginLine(tally, "tail", line, pageIndex);
  });
  appendPipeStyleMarginLineTallies(tally, linesPerPage);
  return tally;
};

const regexesFromTallies = (tally: Map<string, MarginTally>, pageCount: number) => {
  const threshold = Math.max(MIN_LINE_HITS, Math.ceil(MIN_LINE_PAGE_FRACTION * pageCount));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of tally.values()) {
    if (v.pages.size < threshold) continue;
    const re = lineToDigitAwareRegex(v.sample);
    if (!re || seen.has(re)) continue;
    seen.add(re);
    out.push(re);
  }
  return out;
};

const extractLinesPerPage = async (pdfBytes: Uint8Array) => {
  const doc = await loadPdfJsDocumentFromBytes(pdfBytes);
  try {
    const out: string[][] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const text = await page.getTextContent();
      out.push(buildLinesSortedTopToBottom(text.items as TextItemLike[]));
    }
    return out;
  } finally {
    await doc.destroy();
  }
};

export const extractSortedLinesFromPdfPage = async (pdfBytes: Uint8Array, pageNumber: number): Promise<string[]> => {
  const doc = await loadPdfJsDocumentFromBytes(pdfBytes);
  try {
    const n = Math.max(1, Math.min(doc.numPages, Math.floor(pageNumber)));
    const page = await doc.getPage(n);
    const text = await page.getTextContent();
    return buildLinesSortedTopToBottom(text.items as TextItemLike[]);
  } finally {
    await doc.destroy();
  }
};

export const inferPdfRepeatingHeaderFooterRegexes = async (pdfBytes: Uint8Array): Promise<PdfHeaderFooterRegexResult> => {
  const linesPerPage = await extractLinesPerPage(pdfBytes);
  if (linesPerPage.length < MIN_PAGES_FOR_PATTERN) return { regexes: [] };
  const tally = collectMarginTallies(linesPerPage);
  return { regexes: regexesFromTallies(tally, linesPerPage.length) };
};
