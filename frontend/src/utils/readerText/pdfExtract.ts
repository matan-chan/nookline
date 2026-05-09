import type { PDFDocumentProxy } from "pdfjs-dist";
import { DEFAULT_TTS_CHUNK_LIMITS, PDF_LINE_Y_DELTA_PX, type TtsChunkLimits } from "./constants";
import { materializePdfStreamSession } from "./pdfStreamBatches";
import { buildJoinedSpans, normalizeWs, type SpanSeg } from "./ttsChunking";

type PdfTextLineBlock = { text: string; itemIndices: number[] };

type PdfLineItemRun = { str: string; idx: number };

export type PdfExtractLineFilterOpts = { marginLineRegexes?: string[] };

const clampPdfPageIndex = (doc: PDFDocumentProxy, pageNumber: number) => Math.max(1, Math.min(doc.numPages, Math.floor(pageNumber)));

const appendSpaceIfNeeded = (cur: string) => (cur && !cur.endsWith(" ") && !cur.endsWith("\n") ? `${cur} ` : cur);

const joinItemRuns = (runs: readonly PdfLineItemRun[]): { text: string; itemIndices: number[] } => {
  let text = "";
  const itemIndices: number[] = [];
  for (const r of runs) {
    text = appendSpaceIfNeeded(text) + r.str;
    itemIndices.push(r.idx);
  }
  return { text, itemIndices };
};

const buildPdfLineItemRunsPerLineFromTextContent = (tc: { items: readonly unknown[] }): PdfLineItemRun[][] => {
  const lines: PdfLineItemRun[][] = [];
  let runs: PdfLineItemRun[] = [];
  let lastY = Number.NaN;

  const flushLine = () => {
    if (runs.length === 0) return;
    lines.push([...runs]);
    runs = [];
  };

  for (let i = 0; i < tc.items.length; i++) {
    const item = tc.items[i];
    if (!item || typeof item !== "object" || !("str" in item)) continue;
    const s = (item as { str: string }).str;
    if (!s) continue;
    const tr = (item as { transform?: number[] }).transform;
    const y = Array.isArray(tr) ? tr[5] : Number.NaN;
    if (runs.length && !Number.isNaN(y) && !Number.isNaN(lastY) && Math.abs(y - lastY) > PDF_LINE_Y_DELTA_PX) flushLine();
    runs.push({ str: s, idx: i });
    if (!Number.isNaN(y)) lastY = y;
  }
  flushLine();
  return lines;
};

const lineMatchesAnyMarginRegex = (line: string, regexes: string[]) => {
  const t = line.trim();
  if (!t) return false;
  for (const re of regexes) {
    try {
      if (new RegExp(re, "m").test(t)) return true;
    } catch {
      /* skip invalid pattern */
    }
  }
  return false;
};

const stripLongestTrailingMarginSuffixRuns = (runs: PdfLineItemRun[], regexes: string[]): PdfLineItemRun[] => {
  if (runs.length === 0) return runs;
  const full = joinItemRuns(runs).text.trim();
  if (lineMatchesAnyMarginRegex(full, regexes)) return [];
  let bestLen = 0;
  for (let len = 1; len <= runs.length; len++) {
    const tailText = joinItemRuns(runs.slice(runs.length - len)).text.trim();
    if (lineMatchesAnyMarginRegex(tailText, regexes)) bestLen = len;
  }
  if (bestLen === 0) return runs;
  return runs.slice(0, runs.length - bestLen);
};

const buildPdfLineBlocksFromTextContent = (tc: { items: readonly unknown[] }, marginRegexes: string[] | undefined): PdfTextLineBlock[] => {
  const lines = buildPdfLineItemRunsPerLineFromTextContent(tc);
  const out: PdfTextLineBlock[] = [];
  for (const runs of lines) {
    const kept = marginRegexes?.length ? stripLongestTrailingMarginSuffixRuns(runs, marginRegexes) : runs;
    if (kept.length === 0) continue;
    const { text, itemIndices } = joinItemRuns(kept);
    out.push({ text, itemIndices });
  }
  return out;
};

const nonEmptyNormalizedSegments = (blocks: PdfTextLineBlock[]) => blocks.map((b) => ({ text: b.text, meta: [...b.itemIndices] })).filter((s) => normalizeWs(s.text).length > 0);

export const buildPdfJoinedFromPageTextContent = (
  pageNumber: number,
  tc: { items: readonly unknown[] },
  opts?: PdfExtractLineFilterOpts,
): { full: string; spans: SpanSeg<number[]>[]; anchor: string } | null => {
  const blocks = buildPdfLineBlocksFromTextContent(tc, opts?.marginLineRegexes);
  const segments = nonEmptyNormalizedSegments(blocks);
  if (!segments.length) return null;
  const { full, spans } = buildJoinedSpans(segments);
  return { full, spans, anchor: `pdf:${pageNumber}` };
};

export const extractPdfPageJoined = async (
  doc: PDFDocumentProxy,
  pageNumber: number,
  opts?: PdfExtractLineFilterOpts,
): Promise<{ full: string; spans: SpanSeg<number[]>[]; anchor: string }> => {
  const n = clampPdfPageIndex(doc, pageNumber);
  const page = await doc.getPage(n);
  const tc = await page.getTextContent();
  const got = buildPdfJoinedFromPageTextContent(n, tc, opts);
  if (!got) return { full: "", spans: [], anchor: `pdf:${n}` };
  return got;
};

export const extractPdfParagraphs = async (
  doc: PDFDocumentProxy,
  pageNumber: number,
  lim: TtsChunkLimits = DEFAULT_TTS_CHUNK_LIMITS,
  opts?: PdfExtractLineFilterOpts,
): Promise<{ paragraphs: string[]; anchor: string; paraItemIndices: number[][] }> => {
  const joined = await extractPdfPageJoined(doc, pageNumber, opts);
  if (!joined.full.length) return { paragraphs: [], anchor: joined.anchor, paraItemIndices: [] };
  const { paragraphs, paraItemIndices } = materializePdfStreamSession(joined.full, joined.spans, null, lim);
  return { paragraphs, anchor: joined.anchor, paraItemIndices };
};
