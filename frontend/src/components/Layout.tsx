import { useAuth } from "../auth/AuthContext";
import AddLibraryModal from "./AddLibraryModal";
import { useSiteDisplayName } from "./AppBranding";
import ConfirmModal from "./ConfirmModal";
import EditLibraryModal from "./EditLibraryModal";
import { useMutation, useQuery } from "@apollo/client";
import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Box, Drawer, Fade, IconButton, Toolbar, Typography, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { DELETE_LIBRARY, LIBRARIES_QUERY, RAIL_EXPANDED, type LayoutOutletContext, type LibraryNavItem } from "./layout/layoutConstants";
import { dashboardHomeRefetch } from "../pages/dashboard/dashboardQueries";
import { LayoutSidebar } from "./layout/LayoutSidebar";

export type { LayoutOutletContext, LibraryNavItem } from "./layout/layoutConstants";

const Layout = () => {
  const siteDisplayName = useSiteDisplayName();
  const { t } = useTranslation("layout");
  const theme = useTheme();
  const isMobileNav = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [addLibraryOpen, setAddLibraryOpen] = useState(false);
  const [libraryPendingDelete, setLibraryPendingDelete] = useState<LibraryNavItem | null>(null);
  const [libraryToEdit, setLibraryToEdit] = useState<LibraryNavItem | null>(null);
  const [railHovered, setRailHovered] = useState(false);
  const [railPinned, setRailPinned] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const expanded = railHovered || railPinned;

  const { data, refetch } = useQuery<{ libraries: LibraryNavItem[] }>(LIBRARIES_QUERY);
  const [deleteLibrary, { loading: deletingLibrary }] = useMutation(DELETE_LIBRARY, {
    refetchQueries: user ? [{ query: LIBRARIES_QUERY }, dashboardHomeRefetch(user.id)] : [{ query: LIBRARIES_QUERY }],
    awaitRefetchQueries: true,
  });
  const libraries = data?.libraries ?? [];

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLibraryCreated = (lib: LibraryNavItem) => {
    refetch();
    navigate(`/library/${lib.id}`);
  };

  const openAddLibrary = () => setAddLibraryOpen(true);

  const openEditLibrary = (lib: LibraryNavItem) => setLibraryToEdit(lib);

  const togglePin = () => setRailPinned((p) => !p);

  const handleDeleteLibraryConfirm = async () => {
    if (!libraryPendingDelete) return;
    const id = libraryPendingDelete.id;
    try {
      await deleteLibrary({ variables: { id } });
      await refetch();
      setLibraryPendingDelete(null);
      if (location.pathname === `/library/${id}` || location.pathname.startsWith(`/library/${id}/`)) navigate("/");
    } catch {
      /* Apollo errorPolicy / network; keep modal open */
    }
  };

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: { xs: "100dvh", md: "100vh" }, bgcolor: "background.default" }}>
      {isMobileNav && (
        <AppBar
          position="sticky"
          elevation={0}
          color="transparent"
          sx={(th) => ({
            bgcolor: th.surfaces.low,
            color: th.palette.text.primary,
            backgroundImage: "none",
            borderBottom: `1px solid ${alpha(th.palette.divider, 0.35)}`,
            zIndex: th.zIndex.appBar,
          })}
        >
          <Toolbar variant="dense" sx={{ gap: 1, minHeight: 48, color: "inherit" }}>
            <IconButton edge="start" color="inherit" aria-label={t("openMenuAria")} onClick={() => setMobileNavOpen(true)} sx={{ color: "text.primary" }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" color="inherit" sx={{ fontWeight: 700, flex: 1, letterSpacing: "0.02em" }}>
              {siteDisplayName}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0 }}>
        {!isMobileNav && (
          <LayoutSidebar expanded={expanded} railPinned={railPinned} setRailHovered={setRailHovered} togglePin={togglePin} openAddLibrary={openAddLibrary} libraries={libraries} setLibraryPendingDelete={setLibraryPendingDelete} t={t} />
        )}

        {isMobileNav && (
          <Drawer
            anchor="left"
            open={mobileNavOpen}
            onClose={closeMobileNav}
            slotProps={{
              paper: {
                sx: (th) => ({
                  width: RAIL_EXPANDED,
                  maxWidth: "min(100vw - 48px, 280px)",
                  boxSizing: "border-box",
                  bgcolor: th.surfaces.low,
                }),
              },
            }}
            ModalProps={{ keepMounted: true }}
          >
            <LayoutSidebar
              expanded
              railPinned={false}
              setRailHovered={() => {}}
              togglePin={() => {}}
              openAddLibrary={openAddLibrary}
              libraries={libraries}
              setLibraryPendingDelete={setLibraryPendingDelete}
              t={t}
              mobileDrawer
              onNavigate={closeMobileNav}
            />
          </Drawer>
        )}

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarGutter: "stable",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <Fade key={location.pathname} in timeout={{ enter: 280, exit: 200 }} appear>
            <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <Outlet context={{ openAddLibrary, setLibraryPendingDelete, openEditLibrary } as LayoutOutletContext} />
            </Box>
          </Fade>
        </Box>
      </Box>

      <AddLibraryModal open={addLibraryOpen} onClose={() => setAddLibraryOpen(false)} onCreated={handleLibraryCreated} />

      <EditLibraryModal open={libraryToEdit != null} library={libraryToEdit} onClose={() => setLibraryToEdit(null)} onUpdated={() => refetch()} />

      <ConfirmModal
        open={libraryPendingDelete != null}
        onClose={() => {
          if (!deletingLibrary) setLibraryPendingDelete(null);
        }}
        onConfirm={handleDeleteLibraryConfirm}
        title={t("deleteLibraryTitle")}
        message={libraryPendingDelete ? t("deleteLibraryMessage", { name: libraryPendingDelete.name }) : ""}
        confirmLabel={t("deleteLibraryConfirm")}
        loading={deletingLibrary}
      />
    </Box>
  );
};

export default Layout;
