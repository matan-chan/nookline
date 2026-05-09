import type { PrismaClient, User } from "@prisma/client";
import { ttsUpstreamConnectionMessage } from "../../utils/ttsUpstreamError";
import { beLog, beLogErr } from "../../utils/beLog";

const PROBE_TEXT = "Hi.";
const MIN_PROBE_AUDIO_BYTES = 48;
const PROBE_TIMEOUT_MS = 20_000;
const PROBE_ERROR_BODY_MAX = 400;
const JSON_LIKE_PREFIX_BYTES = 240;

export type ResolvedTtsTarget = {
  speechUrl: string;
  authorization: string | null;
  defaultVoice: string;
  defaultModel: string;
};

export const resolveTtsTarget = async (prisma: PrismaClient, userId: number): Promise<ResolvedTtsTarget> => {
  beLog("resolveTtsTarget", { userId });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  return user.ttsMode === "custom" ? buildCustomTtsTarget(user) : buildKokoroTtsTarget(user);
};

export const probeTtsSynthesis = async (
  target: ResolvedTtsTarget
): Promise<{ ok: boolean; error: string | null }> => {
  beLog("probeTtsSynthesis");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (target.authorization) headers.Authorization = target.authorization;
  let upstream: Response;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), PROBE_TIMEOUT_MS);
    upstream = await fetch(target.speechUrl, {
      method: "POST",
      headers,
      signal: ac.signal,
      body: JSON.stringify(buildProbeRequestBody(target)),
    });
    clearTimeout(timer);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError")
      return {
        ok: false,
        error: `TTS test timed out after ${PROBE_TIMEOUT_MS / 1000}s (${target.speechUrl})`,
      };
    return { ok: false, error: ttsUpstreamConnectionMessage(e, target.speechUrl) };
  }
  if (!upstream.ok) return { ok: false, error: await readUpstreamErrorDetail(upstream) };
  const bufResult = await readProbeResponseBuffer(upstream);
  if (!bufResult.ok) return bufResult;
  const jsonLikeError = probeJsonLikeErrorFromBuffer(bufResult.buf, upstream.headers.get("content-type") ?? "");
  if (jsonLikeError) return { ok: false, error: jsonLikeError };
  return { ok: true, error: null };
};

const buildProbeRequestBody = (target: ResolvedTtsTarget) => ({
  model: target.defaultModel,
  input: PROBE_TEXT,
  voice: target.defaultVoice,
  speed: 1,
  response_format: "mp3",
});

const readUpstreamErrorDetail = async (upstream: Response) => {
  let detail = upstream.statusText || `HTTP ${upstream.status}`;
  try {
    const txt = await upstream.text();
    if (txt.trim()) detail = txt.trim().slice(0, PROBE_ERROR_BODY_MAX);
  } catch {}
  return detail;
};

const readProbeResponseBuffer = async (
  upstream: Response
): Promise<{ ok: true; buf: ArrayBuffer } | { ok: false; error: string }> => {
  try {
    const buf = await upstream.arrayBuffer();
    if (buf.byteLength < MIN_PROBE_AUDIO_BYTES)
      return {
        ok: false,
        error: `TTS returned only ${buf.byteLength} bytes (expected audio data)`,
      };
    return { ok: true, buf };
  } catch (e) {
    beLogErr("readProbeResponseBuffer", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to read TTS response body",
    };
  }
};

const probeJsonLikeErrorFromBuffer = (buf: ArrayBuffer, contentType: string) => {
  if (!/application\/json|text\//i.test(contentType)) return null;
  const head = new TextDecoder().decode(buf.slice(0, JSON_LIKE_PREFIX_BYTES)).trim();
  if (head.startsWith("{") || head.startsWith("[")) return head.slice(0, PROBE_ERROR_BODY_MAX);
  return null;
};

const normalizeOpenAiTtsBaseUrl = (raw: string) => {
  let s = raw.trim().replace(/\/+$/, "");
  for (let i = 0; i < 8 && /\/v1$/i.test(s); i++) s = s.replace(/\/v1$/i, "").replace(/\/+$/, "");
  return s;
};

const kokoroPresetBaseUrl = () => {
  const raw =
    process.env.TTS_URL?.trim() || process.env.KOKORO_TTS_URL?.trim() || "http://127.0.0.1:8880";
  return normalizeOpenAiTtsBaseUrl(raw);
};

const buildKokoroTtsTarget = (user: User): ResolvedTtsTarget => {
  beLog("buildKokoroTtsTarget", { userId: user.id });
  const voice = user.ttsVoice?.trim() || "af_heart";
  const model = user.ttsModel?.trim() || "kokoro";
  const base = kokoroPresetBaseUrl();
  return {
    speechUrl: `${base}/v1/audio/speech`,
    authorization: null,
    defaultVoice: voice,
    defaultModel: model || "kokoro",
  };
};

const buildCustomTtsTarget = (user: User): ResolvedTtsTarget => {
  beLog("buildCustomTtsTarget", { userId: user.id });
  const raw = user.ttsCustomBaseUrl?.trim();
  if (!raw) throw new Error("Custom TTS is selected but no base URL is configured");
  const base = normalizeOpenAiTtsBaseUrl(raw);
  const key = user.ttsCustomApiKey?.trim() || null;
  const voice = user.ttsVoice?.trim() || "af_heart";
  const model = user.ttsModel?.trim() || "kokoro";
  return {
    speechUrl: `${base}/v1/audio/speech`,
    authorization: key ? `Bearer ${key}` : null,
    defaultVoice: voice,
    defaultModel: model,
  };
};
