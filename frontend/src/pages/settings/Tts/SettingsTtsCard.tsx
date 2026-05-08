import { SettingsTtsCardProviderFields } from "./components/SettingsTtsCardProviderFields";
import { SettingsTtsCardChunkSection } from "./components/SettingsTtsCardChunkSection";
import { SettingsTtsCardReaderPrefs } from "./components/SettingsTtsCardReaderPrefs";
import { SettingsTtsCardProbeRow } from "./components/SettingsTtsCardProbeRow";
import { RangeField, SettingsCard } from "../SettingsPrimitives";
import { SettingsTtsResetDialog } from "./components/SettingsTtsReset";
import { useTranslation } from "react-i18next";
import { Box, Button, Stack, Typography } from "@mui/material";

type Probe = { ok: boolean; error: string | null } | null | undefined;

type TtsSettingsRow = {
  hasCustomApiKey: boolean;
};

export const SettingsTtsCard = ({
  probe,
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
  ttsData,
  onSaveTts,
  onClearApiKey,
  ttsSaving,
  ttsSavedHint,
  speed,
  setSpeed,
  chunkMinDraft,
  setChunkMinDraft,
  chunkMaxDraft,
  setChunkMaxDraft,
  chunkPeriodDraft,
  setChunkPeriodDraft,
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
}: {
  probe: Probe;
  ttsMode: "kokoro" | "custom";
  setTtsMode: (m: "kokoro" | "custom") => void;
  customBaseUrl: string;
  setCustomBaseUrl: (v: string) => void;
  customApiKeyDraft: string;
  setCustomApiKeyDraft: (v: string) => void;
  ttsVoice: string;
  setTtsVoice: (v: string) => void;
  ttsModel: string;
  setTtsModel: (v: string) => void;
  ttsData: { ttsSettings: TtsSettingsRow } | undefined;
  onSaveTts: () => void;
  onClearApiKey: () => void;
  ttsSaving: boolean;
  ttsSavedHint: string | null;
  speed: number;
  setSpeed: (n: number) => void;
  chunkMinDraft: string;
  setChunkMinDraft: (v: string) => void;
  chunkMaxDraft: string;
  setChunkMaxDraft: (v: string) => void;
  chunkPeriodDraft: string;
  setChunkPeriodDraft: (v: string) => void;
  chunkFieldsError: string | null;
  readerShowPage: boolean;
  setReaderShowPage: (v: boolean) => void;
  readerShowTitle: boolean;
  setReaderShowTitle: (v: boolean) => void;
  readerStripPdfMargins: boolean;
  setReaderStripPdfMargins: (v: boolean) => void;
  hasNonDefaultTtsSettings: boolean;
  resetDialogOpen: boolean;
  setResetDialogOpen: (v: boolean) => void;
  onConfirmResetTts: () => void;
  resetDoneHint: string | null;
}) => {
  const { t } = useTranslation("settings");

  return (
    <SettingsCard>
      <SettingsTtsCardProbeRow probe={probe} t={t} />
      <SettingsTtsCardProviderFields
        t={t}
        ttsMode={ttsMode}
        setTtsMode={setTtsMode}
        customBaseUrl={customBaseUrl}
        setCustomBaseUrl={setCustomBaseUrl}
        customApiKeyDraft={customApiKeyDraft}
        setCustomApiKeyDraft={setCustomApiKeyDraft}
        ttsVoice={ttsVoice}
        setTtsVoice={setTtsVoice}
        ttsModel={ttsModel}
        setTtsModel={setTtsModel}
        ttsData={ttsData}
        onClearApiKey={onClearApiKey}
      />
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.08em", display: "block", mb: 1 }}>
          {t("playbackSection")}
        </Typography>
        <RangeField label={t("speed")} value={speed} min={0.5} max={2} step={0.1} onChange={setSpeed} />
      </Box>
      <SettingsTtsCardChunkSection
        t={t}
        chunkMinDraft={chunkMinDraft}
        setChunkMinDraft={setChunkMinDraft}
        chunkMaxDraft={chunkMaxDraft}
        setChunkMaxDraft={setChunkMaxDraft}
        chunkPeriodDraft={chunkPeriodDraft}
        setChunkPeriodDraft={setChunkPeriodDraft}
        chunkFieldsError={chunkFieldsError}
      />
      <SettingsTtsCardReaderPrefs
        t={t}
        readerShowPage={readerShowPage}
        setReaderShowPage={setReaderShowPage}
        readerShowTitle={readerShowTitle}
        setReaderShowTitle={setReaderShowTitle}
        readerStripPdfMargins={readerStripPdfMargins}
        setReaderStripPdfMargins={setReaderStripPdfMargins}
      />
      <Stack sx={{ pt: 2, borderTop: 1, borderColor: "divider" }} spacing={1}>
        <Stack direction="row" alignItems="stretch" spacing={1.5} sx={{ width: "100%", flexWrap: "nowrap" }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            disabled={ttsSaving || !hasNonDefaultTtsSettings}
            onClick={() => setResetDialogOpen(true)}
            sx={{ flex: 1, minWidth: 0, textTransform: "none", whiteSpace: "normal", lineHeight: 1.25, py: 1 }}
          >
            {t("resetTts")}
          </Button>
          <Button
            variant="contained"
            onClick={onSaveTts}
            disabled={ttsSaving || (ttsMode === "custom" && !customBaseUrl.trim())}
            sx={{
              flex: 1,
              minWidth: 0,
              bgcolor: "primary.main",
              color: "#000",
              fontWeight: 600,
              textTransform: "none",
              whiteSpace: "normal",
              lineHeight: 1.25,
              py: 1,
            }}
          >
            {ttsSaving ? t("savingTts") : t("saveTts")}
          </Button>
        </Stack>
        {(ttsSavedHint || resetDoneHint) ? (
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
            {ttsSavedHint ? (
              <Typography variant="caption" color="secondary.main">
                {ttsSavedHint}
              </Typography>
            ) : null}
            {resetDoneHint ? (
              <Typography variant="caption" color="success.main">
                {resetDoneHint}
              </Typography>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
      <SettingsTtsResetDialog
        t={t}
        open={resetDialogOpen}
        onClose={() => {
          if (!ttsSaving) setResetDialogOpen(false);
        }}
        onConfirm={onConfirmResetTts}
        loading={ttsSaving}
      />
    </SettingsCard>
  );
};
