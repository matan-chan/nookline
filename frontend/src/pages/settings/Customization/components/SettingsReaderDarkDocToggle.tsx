import { Box, Switch, Typography } from "@mui/material";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction<"settings">;
  checked: boolean;
  disabled: boolean;
  onChange: (e: unknown, checked: boolean) => void;
};

export const SettingsReaderDarkDocToggle = ({ t, checked, disabled, onChange }: Props) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: { xs: "column", sm: "row" },
      alignItems: { xs: "stretch", sm: "center" },
      justifyContent: "space-between",
      gap: { xs: 1.5, sm: 2 },
    }}
  >
    <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {t("readerDarkDocumentLabel")}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
        {t("readerAppearanceSectionHint")} {t("readerDarkDocumentHint")}
      </Typography>
    </Box>
    <Switch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      inputProps={{ "aria-label": t("readerDarkDocumentLabel") }}
      sx={{ alignSelf: { xs: "flex-end", sm: "center" }, flexShrink: 0 }}
    />
  </Box>
);
