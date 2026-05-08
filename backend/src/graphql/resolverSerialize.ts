import { beLog, beLogErr } from "../utils/beLog";
import { extname } from "path";

const DEF_CHUNK_MIN = 200;
const DEF_CHUNK_MAX = 300;
const DEF_CHUNK_PERIOD = 300;
const CHUNK_MIN_LO = 20;
const CHUNK_MIN_HI = 4000;
const CHUNK_MAX_LO = 50;
const CHUNK_MAX_HI = 50000;
const CHUNK_GAP = 10;
const CHUNK_PERIOD_LO = 0;
const CHUNK_PERIOD_HI = 50000;
const TTS_SPEED_MIN = 0.25;
const TTS_SPEED_MAX = 4;
const DEFAULT_TTS_VOICE = "af_heart";
const DEFAULT_TTS_MODEL = "kokoro";

export const libraryWithSeriesBooks = {
  books: true,
  series: { include: { books: true } },
} as const;

const serializeDate = (d: Date) => d.toISOString();

export const serializeLibrary = (lib: any) => ({
  ...lib,
  createdAt: serializeDate(lib.createdAt),
});

export const serializeSeries = (s: any) => ({
  ...s,
  createdAt: serializeDate(s.createdAt),
});

export const serializeBook = (b: any) => ({
  ...b,
  createdAt: serializeDate(b.createdAt),
});

export const serializeProgress = (p: any) => ({
  ...p,
  updatedAt: serializeDate(p.updatedAt),
});

export const serializeBookmark = (b: any) => ({
  ...b,
  createdAt: serializeDate(b.createdAt),
});

export const serializeHighlight = (h: any) => ({
  ...h,
  createdAt: serializeDate(h.createdAt),
});

export const serializeVoiceProfile = (v: any) => ({
  ...v,
  createdAt: serializeDate(v.createdAt),
});

export const newestBookFromLibraryParent = (parent: { books?: any[]; series?: { books?: any[] }[] }) => {
  const direct = parent.books ?? [];
  const nested = (parent.series ?? []).flatMap((s) => s.books ?? []);
  const all = [...direct, ...nested];
  if (all.length === 0) return null;
  return all.reduce((best, b) => (new Date(b.createdAt) > new Date(best.createdAt) ? b : best));
};

const clampTtsFloat = (n: number, fallback: number) => (typeof n === "number" && !Number.isNaN(n) ? Math.min(TTS_SPEED_MAX, Math.max(TTS_SPEED_MIN, n)) : fallback);

const clampChunkInt = (n: unknown, lo: number, hi: number, def: number) => {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return def;
  return Math.min(hi, Math.max(lo, v));
};

const normalizeChunkTriple = (minRaw: unknown, maxRaw: unknown, periodRaw: unknown) => {
  let minChars = clampChunkInt(minRaw, CHUNK_MIN_LO, CHUNK_MIN_HI, DEF_CHUNK_MIN);
  let maxChars = clampChunkInt(maxRaw, CHUNK_MAX_LO, CHUNK_MAX_HI, DEF_CHUNK_MAX);
  if (maxChars < minChars + CHUNK_GAP) maxChars = Math.min(CHUNK_MAX_HI, minChars + CHUNK_GAP);
  const periodScanExtra = clampChunkInt(periodRaw, CHUNK_PERIOD_LO, CHUNK_PERIOD_HI, DEF_CHUNK_PERIOD);
  return { minChars, maxChars, periodScanExtra };
};

export type TtsUserChunkExisting = {
  ttsChunkMinChars: number | null;
  ttsChunkMaxChars: number | null;
  ttsChunkPeriodExtra: number | null;
};

export const buildTtsUserUpdatePayload = (input: any, existing: TtsUserChunkExisting): Record<string, unknown> => {
  beLog("buildTtsUserUpdatePayload", { userId: input?.userId });
  const data: Record<string, unknown> = { ttsMode: input.mode };
  if (input.customBaseUrl !== undefined) data.ttsCustomBaseUrl = String(input.customBaseUrl ?? "").trim() || null;
  if (input.customApiKey !== undefined) {
    const k = input.customApiKey;
    if (k === null || k === "") data.ttsCustomApiKey = null;
    else data.ttsCustomApiKey = String(k).trim() || null;
  }
  if (input.voice !== undefined) data.ttsVoice = String(input.voice ?? "").trim() || DEFAULT_TTS_VOICE;
  if (input.model !== undefined) data.ttsModel = String(input.model ?? "").trim() || DEFAULT_TTS_MODEL;
  if (input.speed !== undefined) data.ttsSpeed = clampTtsFloat(Number(input.speed), 1);
  if (input.pitch !== undefined) data.ttsPitch = clampTtsFloat(Number(input.pitch), 1);
  if (input.chunkMinChars !== undefined || input.chunkMaxChars !== undefined || input.chunkPeriodExtra !== undefined) {
    const norm = normalizeChunkTriple(
      input.chunkMinChars !== undefined ? input.chunkMinChars : existing.ttsChunkMinChars,
      input.chunkMaxChars !== undefined ? input.chunkMaxChars : existing.ttsChunkMaxChars,
      input.chunkPeriodExtra !== undefined ? input.chunkPeriodExtra : existing.ttsChunkPeriodExtra
    );
    data.ttsChunkMinChars = norm.minChars;
    data.ttsChunkMaxChars = norm.maxChars;
    data.ttsChunkPeriodExtra = norm.periodScanExtra;
  }
  if (input.readerShowPage !== undefined) data.ttsReaderShowPage = Boolean(input.readerShowPage);
  if (input.readerShowTitle !== undefined) data.ttsReaderShowTitle = Boolean(input.readerShowTitle);
  if (input.readerStripPdfMargins !== undefined) data.ttsReaderStripPdfMargins = Boolean(input.readerStripPdfMargins);
  if (input.readerDarkDocument !== undefined) data.ttsReaderDarkDocument = Boolean(input.readerDarkDocument);
  return data;
};

export const serializeTtsSettings = (
  u: {
    ttsMode: string;
    ttsCustomBaseUrl: string | null;
    ttsCustomApiKey: string | null;
    ttsVoice: string;
    ttsModel: string;
  } & Partial<{
    ttsSpeed: number | null;
    ttsPitch: number | null;
    ttsChunkMinChars: number | null;
    ttsChunkMaxChars: number | null;
    ttsChunkPeriodExtra: number | null;
    ttsReaderShowPage: boolean | null;
    ttsReaderShowTitle: boolean | null;
    ttsReaderStripPdfMargins: boolean | null;
    ttsReaderDarkDocument: boolean | null;
  }>
) => {
  beLog("serializeTtsSettings");
  const chunk = normalizeChunkTriple(u.ttsChunkMinChars ?? DEF_CHUNK_MIN, u.ttsChunkMaxChars ?? DEF_CHUNK_MAX, u.ttsChunkPeriodExtra ?? DEF_CHUNK_PERIOD);
  return {
    mode: u.ttsMode,
    customBaseUrl: u.ttsCustomBaseUrl,
    hasCustomApiKey: Boolean(u.ttsCustomApiKey && String(u.ttsCustomApiKey).trim()),
    voice: u.ttsVoice || DEFAULT_TTS_VOICE,
    model: u.ttsModel || DEFAULT_TTS_MODEL,
    speed: clampTtsFloat(Number(u.ttsSpeed), 1),
    pitch: clampTtsFloat(Number(u.ttsPitch), 1),
    chunkMinChars: chunk.minChars,
    chunkMaxChars: chunk.maxChars,
    chunkPeriodExtra: chunk.periodScanExtra,
    readerShowPage: u.ttsReaderShowPage !== false,
    readerShowTitle: u.ttsReaderShowTitle !== false,
    readerStripPdfMargins: u.ttsReaderStripPdfMargins !== false,
    readerDarkDocument: u.ttsReaderDarkDocument === true,
  };
};

const fileExtFromMetadata = (metadata: string | null | undefined): "pdf" | "epub" | null => {
  if (!metadata) return null;
  try {
    const o = JSON.parse(metadata) as { fileExt?: unknown };
    const x = typeof o.fileExt === "string" ? o.fileExt.toLowerCase() : "";
    if (x === "pdf" || x === "epub") return x;
  } catch (e) {
    beLogErr("fileExtFromMetadata", e);
  }
  return null;
};

export const resolveBookFileExt = (parent: { filePath: string; metadata?: string | null }) => {
  const raw = extname(parent.filePath || "")
    .toLowerCase()
    .replace(/^\./, "");
  if (raw === "pdf" || raw === "epub") return raw;
  return fileExtFromMetadata(parent.metadata);
};
