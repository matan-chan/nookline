import { Box, Button, Stack, Typography } from "@mui/material";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction<"settings">;
  faviconUrl: string | null;
  busy: boolean;
  onOpenFaviconDialog: () => void;
};

export const SettingsCustomizationFavicon = ({ t, faviconUrl, busy, onOpenFaviconDialog }: Props) => (
  <Box>
    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
      {t("faviconLabel")}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
      {t("faviconHint")}
    </Typography>
    <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
      <Button variant="outlined" size="small" disabled={busy} onClick={onOpenFaviconDialog}>
        {t("faviconUpload")}
      </Button>
      {faviconUrl ? (
        <Box component="img" src={faviconUrl} alt="" sx={{ width: 32, height: 32, objectFit: "contain", borderRadius: 1 }} />
      ) : null}
    </Stack>
  </Box>
);
