import { DEFAULT_TTS_CHUNK_LIMITS, SENTENCE_END_CHAR, type TtsChunkLimits } from "./constants";

export type SpanSeg<T> = { start: number; end: number; meta: T };

export const normalizeWs = (t: string) => t.replace(/\s+/g, " ").trim();

const findLastSentenceEndInWindow = (s: string, lowInclusive: number, highInclusive: number): number => {
  if (lowInclusive > highInclusive) return -1;
  for (let p = highInclusive; p >= lowInclusive; p--)
    if (s[p] === SENTENCE_END_CHAR) return p + 1;
  return -1;
};

const findFirstSentenceEndExtended = (s: string, from: number, extendLimit: number): number => {
  const n = s.length;
  for (let p = from; p < extendLimit && p < n; p++)
    if (s[p] === SENTENCE_END_CHAR) return p + 1;
  return -1;
};

const resolveChunkEndExclusive = (s: string, start: number, n: number, lim: TtsChunkLimits): number => {
  const low = start + lim.minChars - 1;
  const maxEnd = Math.min(n, start + lim.maxChars);
  const high = maxEnd - 1;
  let cut = findLastSentenceEndInWindow(s, low, high);
  if (cut < 0) {
    const extendLimit = Math.min(n, start + lim.maxChars + lim.periodScanExtra);
    cut = findFirstSentenceEndExtended(s, maxEnd, extendLimit);
  }
  if (cut < 0) cut = maxEnd > start ? maxEnd : n;
  if (cut <= start) cut = Math.min(n, start + lim.minChars);
  return cut;
};

const mergeTrailingUndersizedChunk = (ranges: { start: number; end: number }[], minChars: number) => {
  if (ranges.length < 2) return;
  const last = ranges[ranges.length - 1];
  const len = last.end - last.start;
  if (len <= 0 || len >= minChars) return;
  const prev = ranges[ranges.length - 2];
  ranges[ranges.length - 2] = { start: prev.start, end: last.end };
  ranges.pop();
};

export const splitIntoTtsChunkRanges = (s: string, lim: TtsChunkLimits = DEFAULT_TTS_CHUNK_LIMITS): { start: number; end: number }[] => {
  const n = s.length;
  if (!n) return [];
  const out: { start: number; end: number }[] = [];
  let start = 0;
  while (start < n) {
    while (start < n && s[start] === " ") start++;
    if (start >= n) break;
    if (n - start < lim.minChars) {
      out.push({ start, end: n });
      break;
    }
    const cut = resolveChunkEndExclusive(s, start, n, lim);
    out.push({ start, end: cut });
    start = cut;
  }
  mergeTrailingUndersizedChunk(out, lim.minChars);
  return out;
};

export const plainTextToTtsChunks = (raw: string, lim: TtsChunkLimits = DEFAULT_TTS_CHUNK_LIMITS): string[] => {
  const full = normalizeWs(raw);
  if (!full) return [];
  return splitIntoTtsChunkRanges(full, lim)
    .map((r) => full.slice(r.start, r.end).trim())
    .filter(Boolean);
};

export const buildJoinedSpans = <T,>(
  segments: { text: string; meta: T }[],
): { full: string; spans: SpanSeg<T>[] } => {
  let full = "";
  const spans: SpanSeg<T>[] = [];
  for (const seg of segments) {
    const t = normalizeWs(seg.text);
    if (!t) continue;
    if (full.length) full += " ";
    const segStart = full.length;
    full += t;
    spans.push({ start: segStart, end: full.length, meta: seg.meta });
  }
  return { full, spans };
};

export const collectIndicesOverlappingRange = <T,>(
  spans: SpanSeg<T>[],
  rangeStart: number,
  rangeEnd: number,
  getIndices: (meta: T) => Iterable<number>,
): number[] => {
  const idxSet = new Set<number>();
  for (const sp of spans) {
    if (sp.end <= rangeStart || sp.start >= rangeEnd) continue;
    for (const ii of getIndices(sp.meta)) idxSet.add(ii);
  }
  return [...idxSet].sort((a, b) => a - b);
};
