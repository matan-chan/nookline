import { useAppFaviconHref, useSiteDisplayName } from "../AppBranding";
import { LayoutSidebarBrand } from "./LayoutSidebarBrand";
import { LayoutSidebarFooter } from "./LayoutSidebarFooter";
import { LayoutSidebarLibraries } from "./LayoutSidebarLibraries";
import { LayoutSidebarMainNav } from "./LayoutSidebarMainNav";
import { RAIL_COLLAPSED, RAIL_EXPANDED, type LibraryNavItem } from "./layoutConstants";
import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { TFunction } from "i18next";

type Props = {
  expanded: boolean;
  railPinned: boolean;
  setRailHovered: (v: boolean) => void;
  togglePin: () => void;
  openAddLibrary: () => void;
  libraries: LibraryNavItem[];
  setLibraryPendingDelete: (lib: LibraryNavItem | null) => void;
  t: TFunction<"layout">;
  mobileDrawer?: boolean;
  onNavigate?: () => void;
};

export const LayoutSidebar = ({
  expanded,
  railPinned,
  setRailHovered,
  togglePin,
  openAddLibrary,
  libraries,
  setLibraryPendingDelete,
  t,
  mobileDrawer = false,
  onNavigate,
}: Props) => {
  const siteDisplayName = useSiteDisplayName();
  const faviconHref = useAppFaviconHref();
  const brandInitial = siteDisplayName.trim().charAt(0).toUpperCase() || "N";

  return (
    <Box
      component="aside"
      aria-expanded={expanded}
      onMouseEnter={() => {
        if (!mobileDrawer) setRailHovered(true);
      }}
      onMouseLeave={() => {
        if (!mobileDrawer) setRailHovered(false);
      }}
      sx={(th) => ({
        width: mobileDrawer ? RAIL_EXPANDED : expanded ? RAIL_EXPANDED : RAIL_COLLAPSED,
        flexShrink: 0,
        transition: mobileDrawer
          ? "none"
          : th.transitions.create("width", {
              duration: th.transitions.duration.shorter,
              easing: th.transitions.easing.easeOut,
            }),
        overflow: "hidden",
        bgcolor: th.surfaces.low,
        borderRight: mobileDrawer ? "none" : `1px solid ${alpha(th.palette.divider, 0.35)}`,
        display: "flex",
        flexDirection: "column",
        alignSelf: mobileDrawer ? "stretch" : "flex-start",
        height: mobileDrawer ? "100%" : "100vh",
        maxHeight: mobileDrawer ? "100%" : "100vh",
        position: mobileDrawer ? "relative" : "sticky",
        top: mobileDrawer ? undefined : 0,
        zIndex: mobileDrawer ? "auto" : th.zIndex.appBar,
      })}
    >
      <LayoutSidebarBrand
        expanded={expanded}
        mobileDrawer={mobileDrawer}
        railPinned={railPinned}
        faviconHref={faviconHref}
        siteDisplayName={siteDisplayName}
        brandInitial={brandInitial}
        t={t}
        togglePin={togglePin}
      />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <LayoutSidebarMainNav expanded={expanded} t={t} onNavigate={onNavigate} />
        <LayoutSidebarLibraries
          expanded={expanded}
          libraries={libraries}
          t={t}
          openAddLibrary={openAddLibrary}
          setLibraryPendingDelete={setLibraryPendingDelete}
          onNavigate={onNavigate}
        />
      </Box>

      <LayoutSidebarFooter expanded={expanded} t={t} onNavigate={onNavigate} />
    </Box>
  );
};
