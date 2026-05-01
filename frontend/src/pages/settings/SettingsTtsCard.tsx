import { RangeField, SettingsCard } from "./SettingsPrimitives";
import { SettingsTtsCardChunkSection } from "./SettingsTtsCardChunkSection";
import { SettingsTtsCardProbeRow } from "./SettingsTtsCardProbeRow";
import { SettingsTtsCardProviderFields } from "./SettingsTtsCardProviderFields";
import { SettingsTtsCardReaderPrefs } from "./SettingsTtsCardReaderPrefs";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

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
      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
        <Button
          variant="contained"
          onClick={onSaveTts}
          disabled={ttsSaving || (ttsMode === "custom" && !customBaseUrl.trim())}
          sx={{ bgcolor: "primary.main", color: "#000", fontWeight: 600, textTransform: "none" }}
        >
          {ttsSaving ? t("savingTts") : t("saveTts")}
        </Button>
        {ttsSavedHint && (
          <Typography variant="caption" color="secondary.main">
            {ttsSavedHint}
          </Typography>
        )}
      </Stack>
    </SettingsCard>
  );
};
