import { getStoredToken } from "../../auth/authStorage";
import { DEFAULT_TTS_VOICE_ID } from "./ttsPlaybackConstants";

export type TtsVoiceOpts = { userId: number; voice: string; speed: number; model: string; pitch: number };

const clip = (s: string, max: number) => s.trim().slice(0, max);

const parseJsonErrorField = (body: string): string | null => {
  const t = body.trim();
  if (!t || t[0] !== "{") return null;
  try {
    const j = JSON.parse(t) as { error?: unknown };
    if (typeof j.error === "string" && j.error.trim()) return clip(j.error, 500);
  } catch {
    return null;
  }
  return null;
};

const detailFromFailedResponse = async (r: Response): Promise<string> => {
  const body = await r.text();
  const fromJson = parseJsonErrorField(body);
  if (fromJson) return fromJson;
  const plain = body.trim();
  if (plain) return clip(plain, 450);
  return r.statusText || `HTTP ${r.status}`;
};

export const fetchTtsSpeechBlob = async (text: string, opts: TtsVoiceOpts, signal?: AbortSignal) => {
  let r: Response;
  const t = getStoredToken();
  try {
    r = await fetch("/api/tts/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      signal,
      body: JSON.stringify({
        userId: opts.userId,
        text,
        voice: opts.voice.trim() || DEFAULT_TTS_VOICE_ID,
        speed: opts.speed,
        pitch: opts.pitch,
        model: opts.model || "kokoro",
      }),
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const head =
      raw.toLowerCase().includes("abort") || (e instanceof Error && e.name === "AbortError")
        ? "TTS request was cancelled."
        : `Could not reach the app (${clip(raw, 200)}).`;
    throw new Error(head);
  }
  if (!r.ok) throw new Error(await detailFromFailedResponse(r));
  return r.blob();
};
