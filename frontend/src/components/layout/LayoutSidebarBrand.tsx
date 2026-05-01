import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { Avatar, Box, IconButton, Typography } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import type { TFunction } from "i18next";

type Props = {
  expanded: boolean;
  mobileDrawer: boolean;
  railPinned: boolean;
  faviconHref: string | null;
  siteDisplayName: string;
  brandInitial: string;
  t: TFunction<"layout">;
  togglePin: () => void;
};

const brandAvatarSx = (th: Theme) => ({
  width: 36,
  height: 36,
  flexShrink: 0,
  bgcolor: th.surfaces.low,
  color: "primary.main",
  fontSize: "0.9rem",
  fontWeight: 700,
  borderRadius: 1.5,
  overflow: "hidden",
  "& .MuiAvatar-img": { objectFit: "contain", width: "100%", height: "100%", objectPosition: "center" },
});

export const LayoutSidebarBrand = ({
  expanded,
  mobileDrawer,
  railPinned,
  faviconHref,
  siteDisplayName,
  brandInitial,
  t,
  togglePin,
}: Props) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: expanded ? "row" : "column",
      alignItems: expanded ? "flex-start" : "center",
      justifyContent: expanded ? "space-between" : "center",
      gap: expanded ? 0.5 : 1,
      px: expanded ? 1.5 : 1,
      py: 2,
      flexShrink: 0,
    }}
  >
    {expanded ? (
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0, pl: 0.5, flex: 1 }}>
        <Avatar src={faviconHref ?? undefined} alt="" sx={(th) => brandAvatarSx(th)}>
          {brandInitial}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1.2 }}>
            {siteDisplayName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            {t("brandTagline")}
          </Typography>
        </Box>
      </Box>
    ) : (
      <Avatar src={faviconHref ?? undefined} alt="" sx={(th) => brandAvatarSx(th)}>
        {brandInitial}
      </Avatar>
    )}
    {!mobileDrawer ? (
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          togglePin();
        }}
        aria-label={railPinned ? t("unpinSidebar") : t("pinSidebar")}
        sx={{ color: "text.secondary", flexShrink: 0, alignSelf: expanded ? "flex-start" : "center", mt: expanded ? 0.25 : 0 }}
      >
        {railPinned ? <ChevronLeft fontSize="small" /> : <ChevronRight fontSize="small" />}
      </IconButton>
    ) : null}
  </Box>
);
