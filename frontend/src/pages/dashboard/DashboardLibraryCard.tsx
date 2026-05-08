import { useAuth } from "../../auth/AuthContext";
import { dashboardLibrarySyncToastMessage } from "./dashboardLibraryCardSyncToast";
import { dashboardHomeRefetch, SYNC_LIBRARY_FROM_DISK } from "./dashboardQueries";
import { coverCardColumnHoverSx } from "../../utils/layout/staggerGridSx";
import { DashboardLibraryCardMenu } from "./DashboardLibraryCardMenu";
import { LibraryCoverFanStack, LIBRARY_CARD_STACK_FAN_EXTRA_PX } from "./LibraryCoverFanStack";
import type { DashboardLibraryPreview } from "./dashboardLibraryCardTypes";
import { useMutation } from "@apollo/client";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { Alert, Box, IconButton, Snackbar, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { MouseEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export type { DashboardLibraryPreview, DashboardLibraryPreviewBook } from "./dashboardLibraryCardTypes";

type Props = {
  library: DashboardLibraryPreview;
  onRequestDelete: (lib: DashboardLibraryPreview) => void;
  onEditSettings: (lib: DashboardLibraryPreview) => void;
};

const TOAST_AUTOHIDE_MS = 8000;

const DashboardLibraryCard = ({ library, onRequestDelete, onEditSettings }: Props) => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const stackBooks = library.previewBooks ?? [];

  const [syncLibrary, { loading: syncing }] = useMutation(SYNC_LIBRARY_FROM_DISK, {
    refetchQueries: user ? [dashboardHomeRefetch(user.id)] : [],
    onCompleted: (data) => {
      const added = data?.syncLibraryFromDisk ?? [];
      setToast({ msg: dashboardLibrarySyncToastMessage(t, added), severity: "success" });
    },
    onError: () => setToast({ msg: t("librarySyncFailed"), severity: "error" }),
  });

  const closeMenu = () => setAnchorEl(null);

  const runSync = () => {
    closeMenu();
    syncLibrary({ variables: { libraryId: library.id } });
  };

  const handleEditSettings = (e: MouseEvent) => {
    e.stopPropagation();
    closeMenu();
    onEditSettings(library);
  };

  const handleDeleteLibrary = (e: MouseEvent) => {
    e.stopPropagation();
    closeMenu();
    onRequestDelete(library);
  };

  const handleOpenMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  return (
    <>
      <Box sx={{ flex: "0 0 auto", width: { xs: 132 + LIBRARY_CARD_STACK_FAN_EXTRA_PX, sm: 148 + LIBRARY_CARD_STACK_FAN_EXTRA_PX }, ...coverCardColumnHoverSx }}>
        <Box
          className="lib-cover"
          sx={{
            position: "relative",
            aspectRatio: "2/3",
            borderRadius: 2,
            overflow: "visible",
            bgcolor: "transparent",
            transition: "transform 0.2s ease",
          }}
        >
          <Box
            component={Link}
            to={`/library/${library.id}`}
            sx={{ position: "absolute", inset: 0, zIndex: 0, display: "block", borderRadius: 2, overflow: "visible" }}
          >
            <LibraryCoverFanStack books={stackBooks} libraryName={library.name} />
          </Box>
          <IconButton
            size="small"
            aria-label={t("libraryMoreOptionsAria")}
            aria-expanded={Boolean(anchorEl)}
            onClick={handleOpenMenu}
            sx={(th) => ({
              position: "absolute",
              top: 6,
              right: 6,
              zIndex: 20,
              bgcolor: alpha(th.surfaces.highest, 0.85),
              color: "text.secondary",
              "&:hover": { bgcolor: th.surfaces.highest, color: "text.primary" },
            })}
          >
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <DashboardLibraryCardMenu
            t={t}
            anchorEl={anchorEl}
            syncing={syncing}
            onClose={closeMenu}
            onSync={runSync}
            onEditSettings={handleEditSettings}
            onDelete={handleDeleteLibrary}
          />
        </Box>
        <Typography
          component={Link}
          to={`/library/${library.id}`}
          variant="caption"
          color="text.secondary"
          sx={{
            textDecoration: "none",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            "&:hover": { color: "text.primary" },
          }}
        >
          {library.name}
        </Typography>
      </Box>

      <Snackbar open={toast != null} autoHideDuration={TOAST_AUTOHIDE_MS} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={toast?.severity ?? "success"} variant="filled" onClose={() => setToast(null)} sx={{ width: "100%" }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DashboardLibraryCard;
