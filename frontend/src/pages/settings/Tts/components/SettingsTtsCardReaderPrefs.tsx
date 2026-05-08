import { fieldHintSx } from "./settingsTtsCardFieldStyles";
import { Box, Checkbox, FormControlLabel, Typography } from "@mui/material";
import type { TFunction } from "i18next";

export const SettingsTtsCardReaderPrefs = ({
  t,
  readerShowPage,
  setReaderShowPage,
  readerShowTitle,
  setReaderShowTitle,
  readerStripPdfMargins,
  setReaderStripPdfMargins,
}: {
  t: TFunction<"settings">;
  readerShowPage: boolean;
  setReaderShowPage: (v: boolean) => void;
  readerShowTitle: boolean;
  setReaderShowTitle: (v: boolean) => void;
  readerStripPdfMargins: boolean;
  setReaderStripPdfMargins: (v: boolean) => void;
}) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.08em", display: "block", mb: 1 }}>
      {t("aiReaderPanelSection")}
    </Typography>
    <Typography variant="caption" sx={{ ...fieldHintSx, display: "block", mb: 1 }}>
      {t("aiReaderPanelSectionHint")}
    </Typography>
    <FormControlLabel
      control={<Checkbox size="small" checked={readerShowPage} onChange={(_, c) => setReaderShowPage(c)} />}
      label={<Typography variant="body2">{t("readerShowPageLabel")}</Typography>}
    />
    <FormControlLabel
      control={<Checkbox size="small" checked={readerShowTitle} onChange={(_, c) => setReaderShowTitle(c)} />}
      label={<Typography variant="body2">{t("readerShowTitleLabel")}</Typography>}
    />
    <FormControlLabel
      control={<Checkbox size="small" checked={readerStripPdfMargins} onChange={(_, c) => setReaderStripPdfMargins(c)} />}
      label={<Typography variant="body2">{t("readerStripPdfMarginsLabel")}</Typography>}
    />
    <Typography variant="caption" sx={{ ...fieldHintSx, display: "block", mt: -0.5, ml: 4 }}>
      {t("readerStripPdfMarginsHint")}
    </Typography>
  </Box>
);
