import RecordVoiceOverOutlined from "@mui/icons-material/RecordVoiceOverOutlined";
import SettingsCustomizationCard from "./settings/SettingsCustomizationCard";
import PaletteOutlined from "@mui/icons-material/PaletteOutlined";
import { useSettingsTtsForm } from "./settings/useSettingsTtsForm";
import { SectionTitle } from "./settings/SettingsPrimitives";
import SettingsUsersCard from "./settings/SettingsUsersCard";
import { SettingsTtsCard } from "./settings/SettingsTtsCard";
import { useTranslation } from "react-i18next";
import { Box, Stack, Typography } from "@mui/material";

const Settings = () => {
  const { t } = useTranslation("settings");
  const tts = useSettingsTtsForm();

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: "100%" }}>
      <Stack spacing={5}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t("pageTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("pageSubtitle")}
          </Typography>
        </Box>

        <SettingsUsersCard />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 5, md: 3 }}
          alignItems="stretch"
          sx={{ width: "100%" }}
        >
          <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
            <SectionTitle icon={<PaletteOutlined />}>{t("sectionCustomization")}</SectionTitle>
            <SettingsCustomizationCard />
          </Stack>

          <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
            <SectionTitle icon={<RecordVoiceOverOutlined />}>{t("sectionTts")}</SectionTitle>
            <SettingsTtsCard
              probe={tts.probe}
              ttsMode={tts.ttsMode}
              setTtsMode={tts.setTtsMode}
              customBaseUrl={tts.customBaseUrl}
              setCustomBaseUrl={tts.setCustomBaseUrl}
              customApiKeyDraft={tts.customApiKeyDraft}
              setCustomApiKeyDraft={tts.setCustomApiKeyDraft}
              ttsVoice={tts.ttsVoice}
              setTtsVoice={tts.setTtsVoice}
              ttsModel={tts.ttsModel}
              setTtsModel={tts.setTtsModel}
              ttsData={tts.ttsData}
              onSaveTts={tts.onSaveTts}
              onClearApiKey={tts.onClearApiKey}
              ttsSaving={tts.ttsSaving}
              ttsSavedHint={tts.ttsSavedHint}
              speed={tts.speed}
              setSpeed={tts.setSpeed}
              chunkMinDraft={tts.chunkMinDraft}
              setChunkMinDraft={tts.setChunkMinDraft}
              chunkMaxDraft={tts.chunkMaxDraft}
              setChunkMaxDraft={tts.setChunkMaxDraft}
              chunkPeriodDraft={tts.chunkPeriodDraft}
              setChunkPeriodDraft={tts.setChunkPeriodDraft}
              chunkFieldsError={tts.chunkFieldsError}
              readerShowPage={tts.readerShowPage}
              setReaderShowPage={tts.setReaderShowPage}
              readerShowTitle={tts.readerShowTitle}
              setReaderShowTitle={tts.setReaderShowTitle}
              readerStripPdfMargins={tts.readerStripPdfMargins}
              setReaderStripPdfMargins={tts.setReaderStripPdfMargins}
              hasNonDefaultTtsSettings={tts.hasNonDefaultTtsSettings}
              resetDialogOpen={tts.resetDialogOpen}
              setResetDialogOpen={tts.setResetDialogOpen}
              onConfirmResetTts={tts.onConfirmResetTts}
              resetDoneHint={tts.resetDoneHint}
            />
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
};

export default Settings;
