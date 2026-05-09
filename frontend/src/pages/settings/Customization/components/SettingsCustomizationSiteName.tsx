import { sanitizeLettersDigitsAndWhitespace } from "../../../../utils/input/sanitizeUserInput";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import type { TFunction } from "i18next";

const SITE_NAME_MAX_LEN = 120;

type Props = {
  t: TFunction<"settings">;
  siteNameDraft: string;
  setSiteNameDraft: (v: string) => void;
  savingSiteName: boolean;
  onSave: () => void;
  siteNameSavedHint: string | null;
};

export const SettingsCustomizationSiteName = ({
  t,
  siteNameDraft,
  setSiteNameDraft,
  savingSiteName,
  onSave,
  siteNameSavedHint,
}: Props) => (
  <Box>
    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
      {t("siteNameLabel")}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
      {t("siteNameHint", { max: SITE_NAME_MAX_LEN })}
    </Typography>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }}>
      <TextField
        size="small"
        value={siteNameDraft}
        onChange={(e) => setSiteNameDraft(sanitizeLettersDigitsAndWhitespace(e.target.value).slice(0, SITE_NAME_MAX_LEN))}
        placeholder={t("siteNamePlaceholder")}
        disabled={savingSiteName}
        sx={{ flex: 1, minWidth: 0, maxWidth: { sm: 360 } }}
        inputProps={{ maxLength: SITE_NAME_MAX_LEN, "aria-label": t("siteNameLabel") }}
      />
      <Button variant="contained" size="small" disabled={savingSiteName} onClick={onSave}>
        {t("saveSiteName")}
      </Button>
    </Stack>
    {siteNameSavedHint ? (
      <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 0.75 }}>
        {siteNameSavedHint}
      </Typography>
    ) : null}
  </Box>
);
