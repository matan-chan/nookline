import { getStoredToken } from "../../auth/authStorage";
import { DEFAULT_TTS_CHUNK_LIMITS } from "../../utils/readerText/constants";
import { parsePdfMarginStripRegexesFromBookMetadata } from "../../utils/parsePdfMarginStripRegexesFromBookMetadata";
import { DEFAULT_TTS_VOICE_ID } from "../../hooks/tts/ttsPlaybackConstants";
import { UPDATE_TTS_SETTINGS } from "../settings/settingsQueries";
import { READER_TTS_SETTINGS } from "./readerQueries";
import { useMutation, useQuery } from "@apollo/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ReaderTtsSettings = {
  mode: string;
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

type Args = { userId: number; bookId: string | undefined; aiOpen: boolean; bookMetadata: string | null };

export const useReaderTtsSettings = ({ userId, bookId, aiOpen, bookMetadata }: Args) => {
  const [voice, setVoice] = useState(DEFAULT_TTS_VOICE_ID);
  const [speed, setSpeed] = useState(1);
  const [voiceOptions, setVoiceOptions] = useState<string[]>([]);
  const hydratedRef = useRef(false);

  const { data: ttsData, refetch: refetchTts } = useQuery<{ ttsSettings: ReaderTtsSettings }>(READER_TTS_SETTINGS, {
    variables: { userId },
    skip: !bookId,
  });

  const [updateTtsSettings] = useMutation(UPDATE_TTS_SETTINGS, {
    refetchQueries: [{ query: READER_TTS_SETTINGS, variables: { userId } }],
  });

  const readerTtsChunkLimits = useMemo(() => {
    const s = ttsData?.ttsSettings;
    if (!s) return DEFAULT_TTS_CHUNK_LIMITS;
    return {
      minChars: typeof s.chunkMinChars === "number" ? s.chunkMinChars : DEFAULT_TTS_CHUNK_LIMITS.minChars,
      maxChars: typeof s.chunkMaxChars === "number" ? s.chunkMaxChars : DEFAULT_TTS_CHUNK_LIMITS.maxChars,
      periodScanExtra: typeof s.chunkPeriodExtra === "number" ? s.chunkPeriodExtra : DEFAULT_TTS_CHUNK_LIMITS.periodScanExtra,
    };
  }, [ttsData?.ttsSettings]);

  const pdfMarginStripRegexes = useMemo(() => parsePdfMarginStripRegexesFromBookMetadata(bookMetadata), [bookMetadata]);
  const pdfMarginStripEnabled = ttsData?.ttsSettings?.readerStripPdfMargins !== false && pdfMarginStripRegexes.length > 0;
  const readerDarkDocument = ttsData?.ttsSettings?.readerDarkDocument === true;

  const commitPlayback = useCallback(
    (patch: { voice?: string; speed?: number }) => {
      const s = ttsData?.ttsSettings;
      if (!s) return;
      const voiceVal = (patch.voice ?? voice).trim() || DEFAULT_TTS_VOICE_ID;
      const speedVal = patch.speed !== undefined ? patch.speed : speed;
      const pitchVal = typeof s.pitch === "number" ? s.pitch : 1;
      if (patch.voice !== undefined) setVoice(patch.voice);
      if (patch.speed !== undefined) setSpeed(patch.speed);
      void updateTtsSettings({
        variables: { input: { userId, mode: s.mode, voice: voiceVal, model: s.model?.trim() || "kokoro", speed: speedVal, pitch: pitchVal } },
      });
    },
    [ttsData?.ttsSettings, userId, voice, speed, updateTtsSettings]
  );

  useEffect(() => {
    if (!aiOpen || !bookId) return;
    refetchTts();
  }, [aiOpen, bookId, refetchTts]);

  useEffect(() => {
    if (!aiOpen) hydratedRef.current = false;
  }, [aiOpen]);

  useEffect(() => {
    hydratedRef.current = false;
  }, [bookId]);

  useEffect(() => {
    if (!aiOpen || !ttsData?.ttsSettings) return;
    if (hydratedRef.current) return;
    const s = ttsData.ttsSettings;
    const v = s.voice?.trim();
    setVoice(v && v.length > 0 ? v : DEFAULT_TTS_VOICE_ID);
    setSpeed(typeof s.speed === "number" ? s.speed : 1);
    hydratedRef.current = true;
  }, [aiOpen, ttsData?.ttsSettings]);

  useEffect(() => {
    if (!aiOpen) return;
    let cancelled = false;
    const tok = getStoredToken();
    fetch(`/api/tts/voices?userId=${userId}`, { headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}) } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.voices || !Array.isArray(j.voices)) return;
        setVoiceOptions(j.voices.map((x: unknown) => String(x)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [aiOpen, ttsData?.ttsSettings?.mode, userId]);

  return {
    voice,
    setVoice,
    speed,
    setSpeed,
    voiceOptions,
    ttsData,
    readerTtsChunkLimits,
    pdfMarginStripEnabled,
    pdfMarginStripRegexes,
    readerDarkDocument,
    commitPlayback,
  };
};
