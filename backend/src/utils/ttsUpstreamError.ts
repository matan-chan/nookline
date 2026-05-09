import { beLog } from "./beLog";

const isConnectionFailure = (msg: string) =>
  /unable to connect|ECONNREFUSED|ENOTFOUND|fetch failed|NetworkError|failed to connect|socket|not reachable/i.test(
    msg
  );

export const ttsUpstreamConnectionMessage = (e: unknown, requestUrl: string): string => {
  beLog("ttsUpstreamConnectionMessage", { requestUrl: requestUrl.slice(0, 120) });
  const raw = e instanceof Error ? e.message : String(e);
  if (!isConnectionFailure(raw)) return raw;
  let origin = requestUrl;
  let host = "";
  try {
    const u = new URL(requestUrl);
    origin = u.origin;
    host = u.hostname;
  } catch {
    /* keep requestUrl */
  }

  const dockerServiceHost = host === "kokoro" || host === "kokoro-nookline";
  if (dockerServiceHost)
    return `Cannot reach TTS at ${origin}. Hostname "${host}" only resolves on Docker networks (e.g. AnythingLLM's stack). Nookline's backend is reaching Kokoro from wherever it runs — if that is your PC (dev server on :4006), use http://127.0.0.1:<published port>; this repo's compose maps Kokoro as 8882→8880. If the backend runs inside the same compose file as Kokoro, use http://kokoro-nookline:8880.`;

  const looksLocalKokoro = /localhost|127\.0\.0\.1|:8880\b|:8881\b|:8882\b/i.test(requestUrl);
  const hint = looksLocalKokoro
    ? " Start GPU Kokoro (docker compose), or set TTS_URL. If this host has no GPU or Kokoro keeps crashing, use Settings → Text-to-speech → OpenAI compatible and point at CPU Kokoro or another TTS API."
    : " Check Settings → custom TTS base URL, VPN, firewall, and that the service is running.";
  return `Cannot reach TTS at ${origin}.${hint}`;
};
