import { useAuth } from "../../auth/AuthContext";
import { dashboardLibrarySyncToastMessage } from "./dashboardLibraryCardSyncToast";
import { dashboardHomeRefetch, SYNC_LIBRARY_FROM_DISK } from "./dashboardQueries";
import { BookCoverImg } from "../../components/BookCoverImg";
import { coverCardColumnHoverSx } from "../../utils/staggerGridSx";
import { getCoverUrl } from "../../utils/cover";
import { useMutation } from "@apollo/client";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { Alert, Box, IconButton, Menu, MenuItem, Snackbar, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { MouseEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export type DashboardLibraryPreviewBook = {
  id: number;
  title: string;
  coverImagePath: string | null;
  metadata: string | null;
};

export type DashboardLibraryPreview = {
  id: number;
  name: string;
  type: string;
  path: string;
  bannerIndex: number;
  customLibraryBannerId: number | null;
  previewBooks: DashboardLibraryPreviewBook[];
};

const LIBRARY_CARD_STACK_OFFSET_PX = 13;
/** Matches a full 3-cover fan so every library tile keeps the same aspect box height. */
const LIBRARY_CARD_STACK_MAX_DEPTH = 2;

const LibraryCoverFanStack = ({ books, libraryName }: { books: DashboardLibraryPreviewBook[]; libraryName: string }) => {
  if (books.length === 0)
    return (
      <Box
        sx={(th) => ({
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: th.surfaces.high,
          px: 1,
        })}
      >
        <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {libraryName}
        </Typography>
      </Box>
    );

  const n = Math.min(books.length, 3);
  const depthMax = LIBRARY_CARD_STACK_MAX_DEPTH;
  const padLeft = depthMax * LIBRARY_CARD_STACK_OFFSET_PX;
  const layers =
    n === 1
      ? [{ book: books[0], depth: depthMax }]
      : n === 2
        ? [
            { book: books[1], depth: 1 },
            { book: books[0], depth: depthMax },
          ]
        : [
            { book: books[2], depth: 0 },
            { book: books[1], depth: 1 },
            { book: books[0], depth: depthMax },
          ];

  return (
    <>
      {layers.map(({ book, depth }) => {
        const url = getCoverUrl(book);
        const z = depth + 1;
        const translateX = (depth - depthMax) * LIBRARY_CARD_STACK_OFFSET_PX;
        const fromBack = depthMax - depth;
        const rotateZ = -fromBack * 2.25;
        const translateY = fromBack * 2;
        const scale = 1 - fromBack * 0.02;
        const boxShadow =
          fromBack === 0
            ? `0 12px 28px ${alpha("#000000", 0.34)}, 0 4px 10px ${alpha("#000000", 0.22)}, 0 0 28px ${alpha("#ba9eff", 0.1)}, inset 0 0 0 1px ${alpha("#ffffff", 0.06)}`
            : `0 8px 20px ${alpha("#000000", 0.36)}, 0 2px 6px ${alpha("#000000", 0.2)}, inset 0 0 0 1px ${alpha("#000000", 0.18)}`;
        return (
          <Box
            key={book.id}
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              left: padLeft,
              zIndex: z,
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: "background.paper",
              transformOrigin: "right center",
              transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotateZ(${rotateZ}deg)`,
              boxShadow: boxShadow,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            {url ? (
              <BookCoverImg src={url} alt={book.title} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", verticalAlign: "top" }} />
            ) : (
              <Box
                sx={(th) => ({
                  display: "flex",
                  height: "100%",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: th.surfaces.high,
                  px: 0.5,
                })}
              >
                <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ fontSize: "0.65rem", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {book.title}
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </>
  );
};

const DashboardLibraryCard = ({ library, onRequestDelete, onEditSettings }: { library: DashboardLibraryPreview; onRequestDelete: (lib: DashboardLibraryPreview) => void; onEditSettings: (lib: DashboardLibraryPreview) => void }) => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const menuOpen = Boolean(anchorEl);
  const stackBooks = library.previewBooks ?? [];
  const fanExtraPx = LIBRARY_CARD_STACK_MAX_DEPTH * LIBRARY_CARD_STACK_OFFSET_PX;

  const [syncLibrary, { loading: syncing }] = useMutation(SYNC_LIBRARY_FROM_DISK, {
    refetchQueries: user ? [dashboardHomeRefetch(user.id)] : [],
    onCompleted: (data) => {
      const added = data?.syncLibraryFromDisk ?? [];
      setToast({ msg: dashboardLibrarySyncToastMessage(t, added), severity: "success" });
    },
    onError: () => setToast({ msg: t("librarySyncFailed"), severity: "error" }),
  });

  const runSync = () => {
    setAnchorEl(null);
    syncLibrary({ variables: { libraryId: library.id } });
  };

  const handleEditSettings = (e: MouseEvent) => {
    e.stopPropagation();
    setAnchorEl(null);
    onEditSettings(library);
  };

  const handleDeleteLibrary = (e: MouseEvent) => {
    e.stopPropagation();
    setAnchorEl(null);
    onRequestDelete(library);
  };

  return (
    <>
      <Box
        sx={{
          flex: "0 0 auto",
          width: { xs: 132 + fanExtraPx, sm: 148 + fanExtraPx },
          ...coverCardColumnHoverSx,
        }}
      >
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
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              display: "block",
              borderRadius: 2,
              overflow: "visible",
            }}
          >
            <LibraryCoverFanStack books={stackBooks} libraryName={library.name} />
          </Box>
          <IconButton
            size="small"
            aria-label={t("libraryMoreOptionsAria")}
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAnchorEl(e.currentTarget);
            }}
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
          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: {
                sx: (th) => ({
                  minWidth: 120,
                  bgcolor: alpha(th.surfaces.high, 0.95),
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${alpha(th.palette.divider, 0.3)}`,
                }),
              },
            }}
          >
            <MenuItem
              disabled={syncing}
              onClick={(e) => {
                e.stopPropagation();
                runSync();
              }}
              sx={{ fontSize: "0.75rem" }}
            >
              {t("refreshLibrary")}
            </MenuItem>
            <MenuItem onClick={handleEditSettings} sx={{ fontSize: "0.75rem" }}>
              {t("editLibrarySettings")}
            </MenuItem>
            <MenuItem onClick={handleDeleteLibrary} sx={{ fontSize: "0.75rem", color: "error.main" }}>
              {t("deleteLibrary")}
            </MenuItem>
          </Menu>
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

      <Snackbar open={toast != null} autoHideDuration={8000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={toast?.severity ?? "success"} variant="filled" onClose={() => setToast(null)} sx={{ width: "100%" }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DashboardLibraryCard;
