import { useNooklineColorMode } from "../AppThemeProvider";
import SettingsCustomizationCard from "./settings/SettingsCustomizationCard";
import { SectionTitle, SettingsCard } from "./settings/SettingsPrimitives";
import { SettingsTtsCard } from "./settings/SettingsTtsCard";
import SettingsUsersCard from "./settings/SettingsUsersCard";
import { useSettingsTtsForm } from "./settings/useSettingsTtsForm";
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const Settings = () => {
  const { t } = useTranslation("settings");
  const { mode, setMode } = useNooklineColorMode();
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

        <Stack spacing={2}>
          <SectionTitle>{t("sectionAppearance")}</SectionTitle>
          <SettingsCard>
            <Typography variant="body2" color="text.secondary">
              {t("appearanceHint")}
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={mode}
              onChange={(_, v) => v && setMode(v)}
              size="small"
              color="primary"
              sx={{ alignSelf: "flex-start" }}
            >
              <ToggleButton value="dark">{t("themeDark")}</ToggleButton>
              <ToggleButton value="light">{t("themeLight")}</ToggleButton>
            </ToggleButtonGroup>
          </SettingsCard>
        </Stack>

        <Stack spacing={2}>
          <SectionTitle>{t("sectionCustomization")}</SectionTitle>
          <SettingsCustomizationCard />
        </Stack>

        <Stack spacing={2}>
          <SectionTitle>{t("sectionTts")}</SectionTitle>
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
          />
        </Stack>
      </Stack>
    </Box>
  );
};

export default Settings;
