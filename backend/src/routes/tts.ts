import { getAuthUserForRequest } from "../auth/getAuthUserForRequest";
import { prisma } from "../graphql/resolverParts/prisma";
import { resolveTtsTarget } from "../services/tts/ttsResolve";
import { prismaSchemaMessage } from "../utils/prismaSchemaMessage";
import { ttsUpstreamConnectionMessage } from "../utils/ttsUpstreamError";
import { safeUserId } from "../utils/safeUserId";
import { beLog, beLogErr } from "../utils/beLog";
import { Router } from "express";

const router = Router();

const MAX_TEXT_LEN = 12_000;

router.post("/speech", async (req, res) => {
  beLog("route_tts_speech");
  try {
    const u = await getAuthUserForRequest(prisma, req.headers.authorization);
    if (u == null) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }
    const userId = safeUserId(req.body?.userId);
    if (userId !== u.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    if (!text.trim()) {
      beLog("route_tts_speech", { phase: "reject", reason: "empty_text" });
      res.status(400).json({ error: "text is required" });
      return;
    }
    if (text.length > MAX_TEXT_LEN) {
      beLog("route_tts_speech", { phase: "reject", reason: "text_too_long", len: text.length });
      res.status(400).json({ error: `text exceeds ${MAX_TEXT_LEN} characters` });
      return;
    }
    const target = await resolveTtsTarget(prisma, userId);
    const voice = typeof req.body?.voice === "string" && req.body.voice.trim() ? req.body.voice.trim() : target.defaultVoice;
    const speed = typeof req.body?.speed === "number" && !Number.isNaN(req.body.speed) ? req.body.speed : 1;
    const pitchRaw = req.body?.pitch;
    const pitch = typeof pitchRaw === "number" && !Number.isNaN(pitchRaw) ? pitchRaw : undefined;
    const responseFormat =
      typeof req.body?.response_format === "string" && req.body.response_format.trim()
        ? req.body.response_format.trim()
        : "mp3";
    const model =
      typeof req.body?.model === "string" && req.body.model.trim() ? req.body.model.trim() : target.defaultModel;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (target.authorization) headers.Authorization = target.authorization;

    let upstream: Response;
    try {
      upstream = await fetch(target.speechUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          input: text,
          voice,
          speed,
          ...(pitch !== undefined ? { pitch } : {}),
          response_format: responseFormat,
        }),
      });
    } catch (fetchErr) {
      beLogErr("route_tts_speech_fetch", fetchErr);
      res.status(502).json({ error: ttsUpstreamConnectionMessage(fetchErr, target.speechUrl) });
      return;
    }

    if (!upstream.ok) {
      const errText = (await upstream.text()).trim().slice(0, 800);
      const msg = errText || upstream.statusText || `Upstream HTTP ${upstream.status}`;
      beLog("route_tts_speech_upstream", { ok: false, status: upstream.status });
      res.status(502).json({ error: msg });
      return;
    }

    const ct = upstream.headers.get("content-type") ?? "audio/mpeg";
    const buf = Buffer.from(await upstream.arrayBuffer());
    beLog("route_tts_speech", { phase: "ok", bytes: buf.length, userId });
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "no-store");
    res.send(buf);
  } catch (e) {
    beLogErr("route_tts_speech", e);
    const hint = prismaSchemaMessage(e);
    const msg = hint ?? (e instanceof Error ? e.message : "TTS failed");
    res.status(502).json({ error: msg });
  }
});

router.get("/voices", async (req, res) => {
  beLog("route_tts_voices");
  try {
    const u = await getAuthUserForRequest(prisma, req.headers.authorization);
    if (u == null) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }
    const q = req.query.userId;
    const raw = Array.isArray(q) ? q[0] : q;
    const userId = safeUserId(raw);
    if (userId !== u.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const target = await resolveTtsTarget(prisma, userId);
    const base = target.speechUrl.replace(/\/v1\/audio\/speech$/, "");
    const voicesUrl = `${base}/v1/audio/voices`;
    const headers: Record<string, string> = {};
    if (target.authorization) headers.Authorization = target.authorization;
    let upstream: Response;
    try {
      upstream = await fetch(voicesUrl, { headers });
    } catch (fetchErr) {
      beLogErr("route_tts_voices_fetch", fetchErr);
      res.status(502).json({ error: ttsUpstreamConnectionMessage(fetchErr, voicesUrl) });
      return;
    }
    if (!upstream.ok) {
      beLog("route_tts_voices_upstream", { ok: false, status: upstream.status });
      res.status(upstream.status).type("text/plain").send(await upstream.text());
      return;
    }
    const data = await upstream.json();
    beLog("route_tts_voices", { phase: "ok", userId });
    res.json(data);
  } catch (e) {
    beLogErr("route_tts_voices", e);
    const hint = prismaSchemaMessage(e);
    const msg = hint ?? (e instanceof Error ? e.message : "voices list failed");
    res.status(502).json({ error: msg });
  }
});

export default router;
