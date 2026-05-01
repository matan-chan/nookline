import BookmarkBorderOutlined from "@mui/icons-material/BookmarkBorderOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import { List } from "@mui/material";
import type { TFunction } from "i18next";
import { NavItemLink } from "./NavItemLink";

type Props = {
  expanded: boolean;
  t: TFunction<"layout">;
  onNavigate?: () => void;
};

export const LayoutSidebarMainNav = ({ expanded, t, onNavigate }: Props) => (
  <List component="nav" disablePadding sx={{ flex: "0 0 auto" }}>
    <NavItemLink to="/" label={t("navHome")} icon={<HomeOutlined fontSize="small" />} end expanded={expanded} onNavigate={onNavigate} />
    <NavItemLink
      to="/bookmarks"
      label={t("navBookmarks")}
      icon={<BookmarkBorderOutlined fontSize="small" />}
      expanded={expanded}
      onNavigate={onNavigate}
    />
    <NavItemLink to="/settings" label={t("navSettings")} icon={<SettingsOutlined fontSize="small" />} expanded={expanded} onNavigate={onNavigate} />
  </List>
);
