import { DEFAULT_TTS_VOICE_ID } from "../../../../hooks/tts/constants/ttsPlaybackConstants";
import { DEFAULT_TTS_CHUNK_LIMITS } from "../../../../utils/readerText/constants";

export type TtsSavedSnapshot = {
  mode: string;
  customBaseUrl: string | null;
  hasCustomApiKey: boolean;
  voice: string;
  model: string;
  speed: number;
  pitch: number;
  chunkMinChars: number;
  chunkMaxChars: number;
  chunkPeriodExtra: number;
  readerShowPage: boolean;
  readerShowTitle: boolean;
  readerStripPdfMargins: boolean;
  readerDarkDocument: boolean;
};

export const parseChunkWhole = (raw: string): number | null => {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
};

const approxEq = (a: number, b: number) => Math.abs(a - b) < 1e-5;

export const savedSettingsMatchDefaults = (s: TtsSavedSnapshot | undefined): boolean => {
  if (!s) return true;
  if (s.mode !== "kokoro") return false;
  if ((s.customBaseUrl ?? "").trim() !== "") return false;
  if (s.hasCustomApiKey) return false;
  if ((s.voice || DEFAULT_TTS_VOICE_ID) !== DEFAULT_TTS_VOICE_ID) return false;
  if ((s.model || "kokoro") !== "kokoro") return false;
  if (!approxEq(s.speed, 1)) return false;
  if (!approxEq(s.pitch, 1)) return false;
  if (s.chunkMinChars !== DEFAULT_TTS_CHUNK_LIMITS.minChars) return false;
  if (s.chunkMaxChars !== DEFAULT_TTS_CHUNK_LIMITS.maxChars) return false;
  if (s.chunkPeriodExtra !== DEFAULT_TTS_CHUNK_LIMITS.periodScanExtra) return false;
  if (!s.readerShowPage) return false;
  if (!s.readerShowTitle) return false;
  if (!s.readerStripPdfMargins) return false;
  if (s.readerDarkDocument) return false;
  return true;
};

export const buildResetTtsInput = (userId: number) => ({
  userId,
  mode: "kokoro",
  customBaseUrl: null,
  customApiKey: "",
  voice: DEFAULT_TTS_VOICE_ID,
  model: "kokoro",
  speed: 1,
  pitch: 1,
  chunkMinChars: DEFAULT_TTS_CHUNK_LIMITS.minChars,
  chunkMaxChars: DEFAULT_TTS_CHUNK_LIMITS.maxChars,
  chunkPeriodExtra: DEFAULT_TTS_CHUNK_LIMITS.periodScanExtra,
  readerShowPage: true,
  readerShowTitle: true,
  readerStripPdfMargins: true,
  readerDarkDocument: false,
});
