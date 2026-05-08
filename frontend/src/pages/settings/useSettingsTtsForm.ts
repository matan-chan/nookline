import { useAuth } from "../../auth/AuthContext";
import { DEFAULT_TTS_VOICE_ID } from "../../hooks/tts/ttsPlaybackConstants";
import i18n from "../../i18n";
import { TTS_SETTINGS_AND_PROBE, UPDATE_TTS_SETTINGS } from "./settingsQueries";
import { buildResetTtsInput, savedSettingsMatchDefaults } from "./settingsTtsFormHelpers";
import { useSettingsTtsChunkValidation, type ValidatedChunks } from "./useSettingsTtsChunkValidation";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";

const SAVED_HINT_MS = 2500;
const RESET_HINT_MS = 3000;

type TtsSettingsResult = {
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
  const [readerShowPage, setReaderShowPage] = useState(true);
  const [readerShowTitle, setReaderShowTitle] = useState(true);
  const [readerStripPdfMargins, setReaderStripPdfMargins] = useState(true);
  const [ttsSavedHint, setTtsSavedHint] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetDoneHint, setResetDoneHint] = useState<string | null>(null);
  const pendingResetRef = useRef(false);

  const chunks = useSettingsTtsChunkValidation(t);

  const { data: ttsData, loading: ttsLoading, refetch: refetchTts } = useQuery<TtsSettingsResult>(TTS_SETTINGS_AND_PROBE, { variables: { userId }, skip: user == null });

  const [updateTts, { loading: ttsSaving }] = useMutation(UPDATE_TTS_SETTINGS, {
    onCompleted: () => {
      refetchTts();
      setCustomApiKeyDraft("");
      if (pendingResetRef.current) {
        pendingResetRef.current = false;
        setResetDialogOpen(false);
        setResetDoneHint(t("resetTtsDone"));
        setTimeout(() => setResetDoneHint(null), RESET_HINT_MS);
      } else {
        setTtsSavedHint(i18n.t("savedHint", { ns: "settings" }));
        setTimeout(() => setTtsSavedHint(null), SAVED_HINT_MS);
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
    chunks.hydrateChunkDrafts(s);
    setReaderShowPage(s.readerShowPage !== false);
    setReaderShowTitle(s.readerShowTitle !== false);
    setReaderStripPdfMargins(s.readerStripPdfMargins !== false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const hasNonDefaultTtsSettings = useMemo(() => !savedSettingsMatchDefaults(ttsData?.ttsSettings), [ttsData?.ttsSettings]);

  const onConfirmResetTts = () => {
    if (userId === 0) return;
    pendingResetRef.current = true;
    updateTts({ variables: { input: buildResetTtsInput(userId) } });
  };

  const resolvedPitch = () => (typeof ttsData?.ttsSettings?.pitch === "number" ? ttsData.ttsSettings.pitch : 1);

  const buildBaseInput = (validated: ValidatedChunks) => ({
    userId,
    mode: ttsMode,
    voice: ttsVoice.trim() || DEFAULT_TTS_VOICE_ID,
    model: ttsModel.trim() || "kokoro",
    speed,
    pitch: resolvedPitch(),
    ...validated,
    readerShowPage,
    readerShowTitle,
    readerStripPdfMargins,
  });

  const handleSaveTts = () => {
    const validated = chunks.validateChunkDrafts();
    if (!validated) return;
    const input: ReturnType<typeof buildBaseInput> & { customBaseUrl?: string | null; customApiKey?: string } = buildBaseInput(validated);
    if (ttsMode === "custom") input.customBaseUrl = customBaseUrl.trim() || null;
    if (customApiKeyDraft.trim()) input.customApiKey = customApiKeyDraft.trim();
    updateTts({ variables: { input } });
  };

  const handleClearTtsApiKey = () => {
    const validated = chunks.validateChunkDrafts();
    if (!validated) return;
    updateTts({
      variables: {
        input: {
          ...buildBaseInput(validated),
          customBaseUrl: ttsMode === "custom" ? customBaseUrl.trim() || null : null,
          customApiKey: "",
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
    chunkMinDraft: chunks.chunkMinDraft,
    setChunkMinDraft: chunks.setChunkMinDraft,
    chunkMaxDraft: chunks.chunkMaxDraft,
    setChunkMaxDraft: chunks.setChunkMaxDraft,
    chunkPeriodDraft: chunks.chunkPeriodDraft,
    setChunkPeriodDraft: chunks.setChunkPeriodDraft,
    chunkFieldsError: chunks.chunkFieldsError,
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
