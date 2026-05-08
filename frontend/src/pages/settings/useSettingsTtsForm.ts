import { useAuth } from "../../auth/AuthContext";
import { DEFAULT_TTS_VOICE_ID } from "../../hooks/tts/ttsPlaybackConstants";
import { DEFAULT_TTS_CHUNK_LIMITS } from "../../utils/readerText/constants";
import i18n from "../../i18n";
import { TTS_SETTINGS_AND_PROBE, UPDATE_TTS_SETTINGS } from "./settingsQueries";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";

const parseChunkWhole = (raw: string): number | null => {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
};

const approxEq = (a: number, b: number) => Math.abs(a - b) < 1e-5;

type TtsSavedSnapshot = {
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

const savedSettingsMatchDefaults = (s: TtsSavedSnapshot | undefined): boolean => {
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

export const useSettingsTtsForm = () => {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  const [speed, setSpeed] = useState(1.0);
  const [ttsMode, setTtsMode] = useState<"kokoro" | "custom">("kokoro");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customApiKeyDraft, setCustomApiKeyDraft] = useState("");
  const [ttsVoice, setTtsVoice] = useState(DEFAULT_TTS_VOICE_ID);
  const [ttsModel, setTtsModel] = useState("kokoro");
  const [chunkMinDraft, setChunkMinDraft] = useState(String(DEFAULT_TTS_CHUNK_LIMITS.minChars));
  const [chunkMaxDraft, setChunkMaxDraft] = useState(String(DEFAULT_TTS_CHUNK_LIMITS.maxChars));
  const [chunkPeriodDraft, setChunkPeriodDraft] = useState(String(DEFAULT_TTS_CHUNK_LIMITS.periodScanExtra));
  const [chunkFieldsError, setChunkFieldsError] = useState<string | null>(null);
  const [readerShowPage, setReaderShowPage] = useState(true);
  const [readerShowTitle, setReaderShowTitle] = useState(true);
  const [readerStripPdfMargins, setReaderStripPdfMargins] = useState(true);
  const [ttsSavedHint, setTtsSavedHint] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetDoneHint, setResetDoneHint] = useState<string | null>(null);
  const pendingResetRef = useRef(false);

  const { data: ttsData, loading: ttsLoading, refetch: refetchTts } = useQuery<{
    ttsSettings: {
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
    ttsEngineProbe: { ok: boolean; error: string | null };
  }>(TTS_SETTINGS_AND_PROBE, { variables: { userId }, skip: user == null });

  const [updateTts, { loading: ttsSaving }] = useMutation(UPDATE_TTS_SETTINGS, {
    onCompleted: () => {
      refetchTts();
      setCustomApiKeyDraft("");
      if (pendingResetRef.current) {
        pendingResetRef.current = false;
        setResetDialogOpen(false);
        setResetDoneHint(t("resetTtsDone"));
        setTimeout(() => setResetDoneHint(null), 3000);
      } else {
        setTtsSavedHint(i18n.t("savedHint", { ns: "settings" }));
        setTimeout(() => setTtsSavedHint(null), 2500);
      }
    },
    onError: () => {
      pendingResetRef.current = false;
    },
  });

  useEffect(() => {
    const s = ttsData?.ttsSettings;
    if (!s) return;
    setTtsMode(s.mode === "custom" ? "custom" : "kokoro");
    setCustomBaseUrl(s.customBaseUrl ?? "");
    setTtsVoice(s.voice || DEFAULT_TTS_VOICE_ID);
    setTtsModel(s.model || "kokoro");
    setSpeed(typeof s.speed === "number" ? s.speed : 1);
    setChunkMinDraft(String(typeof s.chunkMinChars === "number" ? s.chunkMinChars : DEFAULT_TTS_CHUNK_LIMITS.minChars));
    setChunkMaxDraft(String(typeof s.chunkMaxChars === "number" ? s.chunkMaxChars : DEFAULT_TTS_CHUNK_LIMITS.maxChars));
    setChunkPeriodDraft(
      String(typeof s.chunkPeriodExtra === "number" ? s.chunkPeriodExtra : DEFAULT_TTS_CHUNK_LIMITS.periodScanExtra),
    );
    setReaderShowPage(s.readerShowPage !== false);
    setReaderShowTitle(s.readerShowTitle !== false);
    setReaderStripPdfMargins(s.readerStripPdfMargins !== false);
  }, [
    ttsData?.ttsSettings?.mode,
    ttsData?.ttsSettings?.customBaseUrl,
    ttsData?.ttsSettings?.voice,
    ttsData?.ttsSettings?.model,
    ttsData?.ttsSettings?.speed,
    ttsData?.ttsSettings?.pitch,
    ttsData?.ttsSettings?.chunkMinChars,
    ttsData?.ttsSettings?.chunkMaxChars,
    ttsData?.ttsSettings?.chunkPeriodExtra,
    ttsData?.ttsSettings?.readerShowPage,
    ttsData?.ttsSettings?.readerShowTitle,
    ttsData?.ttsSettings?.readerStripPdfMargins,
  ]);

  const hasNonDefaultTtsSettings = useMemo(
    () => !savedSettingsMatchDefaults(ttsData?.ttsSettings),
    [ttsData?.ttsSettings],
  );

  const onConfirmResetTts = () => {
    if (userId === 0) return;
    pendingResetRef.current = true;
    updateTts({
      variables: {
        input: {
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
        },
      },
    });
  };

  const validateChunkDrafts = (): { chunkMinChars: number; chunkMaxChars: number; chunkPeriodExtra: number } | null => {
    const minN = parseChunkWhole(chunkMinDraft);
    if (minN == null) {
      setChunkFieldsError(t("chunkValidationNumbers"));
      return null;
    }
    if (minN < 20 || minN > 4000) {
      setChunkFieldsError(t("chunkValidationMin"));
      return null;
    }
    const maxN = parseChunkWhole(chunkMaxDraft);
    if (maxN == null) {
      setChunkFieldsError(t("chunkValidationNumbers"));
      return null;
    }
    if (maxN < minN + 10 || maxN > 50000) {
      setChunkFieldsError(t("chunkValidationMax"));
      return null;
    }
    const perN = parseChunkWhole(chunkPeriodDraft);
    if (perN == null) {
      setChunkFieldsError(t("chunkValidationNumbers"));
      return null;
    }
    if (perN > 50000) {
      setChunkFieldsError(t("chunkValidationPeriod"));
      return null;
    }
    setChunkFieldsError(null);
    return { chunkMinChars: minN, chunkMaxChars: maxN, chunkPeriodExtra: perN };
  };

  const handleSaveTts = () => {
    const chunks = validateChunkDrafts();
    if (!chunks) return;
    const input: {
      userId: number;
      mode: string;
      customBaseUrl?: string | null;
      customApiKey?: string;
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
    } = {
      userId,
      mode: ttsMode,
      voice: ttsVoice.trim() || DEFAULT_TTS_VOICE_ID,
      model: ttsModel.trim() || "kokoro",
      speed,
      pitch: typeof ttsData?.ttsSettings?.pitch === "number" ? ttsData.ttsSettings.pitch : 1,
      ...chunks,
      readerShowPage,
      readerShowTitle,
      readerStripPdfMargins,
    };
    if (ttsMode === "custom") input.customBaseUrl = customBaseUrl.trim() || null;
    if (customApiKeyDraft.trim()) input.customApiKey = customApiKeyDraft.trim();
    updateTts({ variables: { input } });
  };

  const handleClearTtsApiKey = () => {
    const chunks = validateChunkDrafts();
    if (!chunks) return;
    updateTts({
      variables: {
        input: {
          userId,
          mode: ttsMode,
          customBaseUrl: ttsMode === "custom" ? customBaseUrl.trim() || null : null,
          customApiKey: "",
          voice: ttsVoice.trim() || DEFAULT_TTS_VOICE_ID,
          model: ttsModel.trim() || "kokoro",
          speed,
          pitch: typeof ttsData?.ttsSettings?.pitch === "number" ? ttsData.ttsSettings.pitch : 1,
          ...chunks,
          readerShowPage,
          readerShowTitle,
          readerStripPdfMargins,
        },
      },
    });
  };

  return {
    probe: ttsData?.ttsEngineProbe,
    ttsData,
    ttsLoading,
    ttsMode,
    setTtsMode,
    customBaseUrl,
    setCustomBaseUrl,
    customApiKeyDraft,
    setCustomApiKeyDraft,
    ttsVoice,
    setTtsVoice,
    ttsModel,
    setTtsModel,
    onSaveTts: handleSaveTts,
    onClearApiKey: handleClearTtsApiKey,
    ttsSaving,
    ttsSavedHint,
    speed,
    setSpeed,
    chunkMinDraft,
    setChunkMinDraft: (v: string) => {
      setChunkFieldsError(null);
      setChunkMinDraft(v);
    },
    chunkMaxDraft,
    setChunkMaxDraft: (v: string) => {
      setChunkFieldsError(null);
      setChunkMaxDraft(v);
    },
    chunkPeriodDraft,
    setChunkPeriodDraft: (v: string) => {
      setChunkFieldsError(null);
      setChunkPeriodDraft(v);
    },
    chunkFieldsError,
    readerShowPage,
    setReaderShowPage,
    readerShowTitle,
    setReaderShowTitle,
    readerStripPdfMargins,
    setReaderStripPdfMargins,
    hasNonDefaultTtsSettings,
    resetDialogOpen,
    setResetDialogOpen,
    onConfirmResetTts,
    resetDoneHint,
  };
};
