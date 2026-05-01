import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import type { TFunction } from "i18next";

type Banner = { id: number; url: string };

type Props = {
  t: TFunction<"settings">;
  banners: Banner[];
  busy: boolean;
  onOpenBannerDialog: () => void;
  onRemoveBanner: (id: number) => void;
};

export const SettingsCustomizationBanners = ({ t, banners, busy, onOpenBannerDialog, onRemoveBanner }: Props) => (
  <Box>
    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
      {t("libraryBannersLabel")}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
      {t("libraryBannersHint")}
    </Typography>
    <Button variant="outlined" size="small" disabled={busy} sx={{ mb: 1.5 }} onClick={onOpenBannerDialog}>
      {t("uploadLibraryBanner")}
    </Button>
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
      {banners.map((b) => (
        <Box key={b.id} sx={{ position: "relative", width: 120 }}>
          <Box component="img" src={b.url} alt="" sx={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 1 }} />
          <Tooltip title={t("removeLibraryBanner")}>
            <IconButton
              size="small"
              color="error"
              disabled={busy}
              onClick={() => onRemoveBanner(b.id)}
              sx={{ position: "absolute", top: 2, right: 2, bgcolor: "rgba(0,0,0,0.45)" }}
              aria-label={t("removeLibraryBanner")}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
    </Box>
  </Box>
);
