import { collectIndicesOverlappingRange, type SpanSeg } from "./ttsChunking";
import type { TtsChunkLimits } from "./constants";

const isSentenceEnd = (c: string) => c === "." || c === "!" || c === "?";

const findSentenceStart = (s: string, pos: number) => {
  const p = Math.min(Math.max(0, pos), Math.max(0, s.length - 1));
  for (let i = p - 1; i >= 0; i--) if (isSentenceEnd(s[i]!)) return i + 1;
  return 0;
};

const findSentenceEndInclusive = (s: string, from: number) => {
  const n = s.length;
  if (!n) return 0;
  for (let i = Math.max(0, from); i < n; i++) if (isSentenceEnd(s[i]!)) return i;
  return n - 1;
};

const skipLeadingSpace = (s: string, offset: number) => {
  let i = offset;
  while (i < s.length && s[i] === " ") i++;
  return i;
};

const buildFirstBatchFromClick = (full: string, clickOffset: number, maxChars: number) => {
  const n = full.length;
  if (!n) return { start: 0, endExclusive: 0 };
  const pos = Math.min(Math.max(0, clickOffset), n - 1);
  const sentStart = findSentenceStart(full, pos);
  const sentEndIncl = findSentenceEndInclusive(full, pos);
  const afterSentence = sentEndIncl + 1;
  const afterCap = Math.min(n, afterSentence + maxChars);
  let endExclusive = afterCap;
  if (afterCap < n) endExclusive = findSentenceEndInclusive(full, afterCap) + 1;
  else endExclusive = n;
  if (endExclusive <= sentStart) endExclusive = Math.min(n, sentStart + 1);
  return { start: sentStart, endExclusive };
};

const buildContinueBatchFromOffset = (full: string, offset: number, maxChars: number) => {
  const n = full.length;
  const start = skipLeadingSpace(full, offset);
  if (start >= n) return { start: n, endExclusive: n };
  const sentEndIncl = findSentenceEndInclusive(full, start);
  const afterSentence = sentEndIncl + 1;
  const afterCap = Math.min(n, afterSentence + maxChars);
  let endExclusive = afterCap;
  if (afterCap < n) endExclusive = findSentenceEndInclusive(full, afterCap) + 1;
  else endExclusive = n;
  if (endExclusive <= start) endExclusive = Math.min(n, start + 1);
  return { start, endExclusive };
};

export const splitPdfPageStreamBatchRanges = (
  full: string,
  clickOffset: number | null,
  maxChars: number,
) => {
  const ranges: { start: number; endExclusive: number }[] = [];
  let cursor = 0;
  if (clickOffset != null) {
    const b = buildFirstBatchFromClick(full, clickOffset, maxChars);
    if (b.endExclusive > b.start) ranges.push(b);
    cursor = b.endExclusive;
  }
  while (cursor < full.length) {
    const b = buildContinueBatchFromOffset(full, cursor, maxChars);
    if (b.endExclusive <= b.start) break;
    if (b.endExclusive === cursor) break;
    ranges.push(b);
    cursor = b.endExclusive;
  }
  return ranges;
};

export const materializePdfStreamSession = (
  full: string,
  spans: SpanSeg<number[]>[],
  clickOffset: number | null,
  lim: TtsChunkLimits,
): { paragraphs: string[]; paraItemIndices: number[][] } => {
  const ranges = splitPdfPageStreamBatchRanges(full, clickOffset, lim.maxChars);
  const paragraphs: string[] = [];
  const paraItemIndices: number[][] = [];
  for (const r of ranges) {
    const t = full.slice(r.start, r.endExclusive).trim();
    if (!t) continue;
    paragraphs.push(t);
    paraItemIndices.push(collectIndicesOverlappingRange(spans, r.start, r.endExclusive, (indices) => indices));
  }
  return { paragraphs, paraItemIndices };
};
