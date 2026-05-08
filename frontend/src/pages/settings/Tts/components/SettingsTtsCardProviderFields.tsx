import { KokoroGenderIcons } from "../../../../components/KokoroGenderIcons";
import { sanitizeTechnicalIdInput } from "../../../../utils/input/sanitizeUserInput";
import { kokoroVoiceLabelAndGender } from "../../../../utils/tts/kokoroVoiceUi";
import { fieldHintSx, fieldLabelProps, providerSelectSx } from "./settingsTtsCardFieldStyles";
import { ProviderMenuRow } from "./SettingsTtsCardPrimitives";
import GraphicEq from "@mui/icons-material/GraphicEq";
import Api from "@mui/icons-material/Api";
import { Box, Button, FormControl, FormLabel, InputAdornment, MenuItem, Select, TextField, Typography } from "@mui/material";
import type { TFunction } from "i18next";

type TtsSettingsRow = { hasCustomApiKey: boolean };

export const SettingsTtsCardProviderFields = ({
  t,
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
  onClearApiKey,
}: {
  t: TFunction<"settings">;
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
  onClearApiKey: () => void;
}) => {
  const { gender } = kokoroVoiceLabelAndGender(ttsVoice, ttsMode === "kokoro");
  const kokoroVoiceAdornment =
    ttsMode === "kokoro" && gender ? (
      <InputAdornment position="start" sx={{ mr: 0 }}>
        <KokoroGenderIcons gender={gender} sx={{ fontSize: 18, color: "text.secondary" }} />
      </InputAdornment>
    ) : undefined;

  return (
    <>
      <Box>
        <FormLabel {...fieldLabelProps}>{t("providerLabel")}</FormLabel>
        <FormControl fullWidth size="small">
          <Select
            value={ttsMode}
            onChange={(e) => setTtsMode(e.target.value as "kokoro" | "custom")}
            sx={providerSelectSx}
            renderValue={(mode) =>
              mode === "kokoro" ? (
                <ProviderMenuRow icon={<GraphicEq fontSize="small" />} title={t("kokoroTitle")} description={t("kokoroDesc")} />
              ) : (
                <ProviderMenuRow icon={<Api fontSize="small" />} title={t("customTitle")} description={t("customDesc")} />
              )
            }
            MenuProps={{
              slotProps: {
                paper: {
                  sx: (th: { palette: { background: { paper: string } } }) => ({
                    bgcolor: th.palette.background.paper,
                    maxWidth: 440,
                  }),
                },
              },
            }}
          >
            <MenuItem value="kokoro" sx={{ alignItems: "flex-start", py: 1.5, whiteSpace: "normal" }}>
              <ProviderMenuRow icon={<GraphicEq fontSize="small" />} title={t("kokoroTitle")} description={t("kokoroDesc")} />
            </MenuItem>
            <MenuItem value="custom" sx={{ alignItems: "flex-start", py: 1.5, whiteSpace: "normal" }}>
              <ProviderMenuRow icon={<Api fontSize="small" />} title={t("customTitle")} description={t("customDesc")} />
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      {ttsMode === "custom" && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
            pt: 0.5,
          }}
        >
          <Box>
            <FormLabel {...fieldLabelProps}>{t("baseUrlLabel")}</FormLabel>
            <TextField
              type="url"
              size="small"
              fullWidth
              placeholder={t("baseUrlPlaceholder")}
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
            />
            <Typography variant="caption" sx={fieldHintSx}>
              {t("baseUrlHintCustom")}
            </Typography>
          </Box>
          <Box>
            <FormLabel {...fieldLabelProps}>{t("apiKeyLabel")}</FormLabel>
            <TextField
              type="password"
              size="small"
              fullWidth
              autoComplete="off"
              placeholder={ttsData?.ttsSettings.hasCustomApiKey ? t("apiKeyPlaceholderMasked") : t("apiKeyPlaceholderNew")}
              value={customApiKeyDraft}
              onChange={(e) => setCustomApiKeyDraft(e.target.value)}
            />
            <Typography variant="caption" sx={fieldHintSx}>
              {t("apiKeyHintCustom")}
            </Typography>
            {ttsData?.ttsSettings.hasCustomApiKey && (
              <Button size="small" onClick={onClearApiKey} sx={{ mt: 1, textTransform: "none", color: "error.main" }}>
                {t("removeApiKey")}
              </Button>
            )}
          </Box>
          <Box>
            <FormLabel {...fieldLabelProps}>{t("customTtsModelLabel")}</FormLabel>
            <TextField size="small" fullWidth placeholder={t("modelIdPlaceholder")} value={ttsModel} onChange={(e) => setTtsModel(sanitizeTechnicalIdInput(e.target.value))} />
            <Typography variant="caption" sx={fieldHintSx}>
              {t("customTtsModelHint")}
            </Typography>
          </Box>
          <Box>
            <FormLabel {...fieldLabelProps}>{t("customVoiceModelLabel")}</FormLabel>
            <TextField size="small" fullWidth placeholder={t("voiceIdPlaceholder")} value={ttsVoice} onChange={(e) => setTtsVoice(sanitizeTechnicalIdInput(e.target.value))} />
            <Typography variant="caption" sx={fieldHintSx}>
              {t("customVoiceModelHint")}
            </Typography>
          </Box>
        </Box>
      )}

      {ttsMode === "kokoro" && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
              pt: 0.5,
            }}
          >
            <Box>
              <FormLabel {...fieldLabelProps}>{t("voiceIdLabel")}</FormLabel>
              <TextField
                size="small"
                fullWidth
                placeholder={t("voiceIdPlaceholder")}
                value={ttsVoice}
                onChange={(e) => setTtsVoice(sanitizeTechnicalIdInput(e.target.value))}
                slotProps={kokoroVoiceAdornment ? { input: { startAdornment: kokoroVoiceAdornment } } : undefined}
              />
              <Typography variant="caption" sx={fieldHintSx}>
                {t("voiceIdHint")}
              </Typography>
            </Box>
            <Box>
              <FormLabel {...fieldLabelProps}>{t("modelIdLabel")}</FormLabel>
              <TextField size="small" fullWidth placeholder={t("modelIdPlaceholder")} value={ttsModel} onChange={(e) => setTtsModel(sanitizeTechnicalIdInput(e.target.value))} />
              <Typography variant="caption" sx={fieldHintSx}>
                {t("modelIdHint")}
              </Typography>
            </Box>
          </Box>

        </>
      )}
    </>
  );
};
