import { useAuth } from "../auth/AuthContext";
import AddBookModal from "../components/AddBookModal";
import type { LayoutOutletContext, LibraryNavItem } from "../components/Layout";
import { getSeriesCoverUrl } from "../utils/cover/cover";
import { LibraryBrowserToolbar } from "./library/LibraryBrowserToolbar";
import { LIBRARY_BROWSER_QUERY, LIBRARY_DELETE_BOOK, LIBRARY_DELETE_SERIES, SYNC_LIBRARY_FROM_DISK } from "./library/libraryQueries";
import { LibraryCoverCard, libraryCardGridSx } from "./library/LibraryCoverCard";
import { LibraryHeroBanner } from "./library/LibraryHeroBanner";
import type { LibraryBrowserLibrary, LibrarySortOption } from "./library/libraryBrowserTypes";
import { sortSeriesForLibraryBrowser, sortStandaloneBooksForLibraryBrowser } from "./library/libraryBrowserSort";
import { resolveLibraryHeroBackground } from "./library/resolveLibraryHeroBackgroundUrl";
import { useQuery, useMutation } from "@apollo/client";
import { Alert, Box, Button, CircularProgress, Snackbar, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext, useParams } from "react-router-dom";

const toNavItem = (lib: LibraryBrowserLibrary): LibraryNavItem => ({
  id: lib.id,
  name: lib.name,
  type: lib.type,
  path: lib.path,
  bannerIndex: lib.bannerIndex,
  customLibraryBannerId: lib.customLibraryBannerId,
});

const LibraryBrowser = () => {
  const { t } = useTranslation("library");
  const { user } = useAuth();
  const { openEditLibrary, setLibraryPendingDelete } = useOutletContext<LayoutOutletContext>();
  const { id } = useParams<{ id: string }>();
  const libraryId = parseInt(id ?? "1");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<LibrarySortOption>("title");

  const [addBookOpen, setAddBookOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const { data, loading, refetch } = useQuery<{ library: LibraryBrowserLibrary }>(LIBRARY_BROWSER_QUERY, {
    variables: { id: libraryId, userId: user?.id ?? 0 },
    skip: user == null,
  });

  const [deleteBook] = useMutation(LIBRARY_DELETE_BOOK, { onCompleted: () => refetch() });
  const [deleteSeries] = useMutation(LIBRARY_DELETE_SERIES, { onCompleted: () => refetch() });
  const [syncLibrary, { loading: syncing }] = useMutation(SYNC_LIBRARY_FROM_DISK, {
    onCompleted: async (d) => {
      const added = (d as { syncLibraryFromDisk?: { title: string }[] } | null | undefined)?.syncLibraryFromDisk ?? [];
      const n = added.length;
      if (n === 0) setToast({ msg: t("librarySyncNone"), severity: "success" });
      else if (n <= 5) setToast({ msg: t("librarySyncAddedList", { titles: added.map((b) => b.title).join(", ") }), severity: "success" });
      else setToast({ msg: t("librarySyncAddedMany", { count: n }), severity: "success" });
      await refetch();
    },
    onError: () => setToast({ msg: t("librarySyncFailed"), severity: "error" }),
  });

  const library = data?.library;
  const heroBackground = library ? resolveLibraryHeroBackground(library) : null;

  const heroMenu = useMemo(() => {
    if (!library) return null;
    return {
      ariaLabel: t("heroLibraryMenuAria", { name: library.name }),
      refetchLabel: syncing ? t("heroMenuRefetchBusy") : t("heroMenuRefetch"),
      editLabel: t("heroMenuEdit"),
      deleteLabel: t("heroMenuDelete"),
      onRefetch: () => syncLibrary({ variables: { libraryId: library.id } }),
      onEdit: () => openEditLibrary(toNavItem(library)),
      onDelete: () => setLibraryPendingDelete(toNavItem(library)),
    };
  }, [library, openEditLibrary, setLibraryPendingDelete, syncLibrary, syncing, t]);

  const query = search.toLowerCase();

  const filteredSeries = useMemo(() => {
    const rows = (library?.series ?? []).filter((s) => s.title.toLowerCase().includes(query));
    return sortSeriesForLibraryBrowser(rows, sort);
  }, [library?.series, query, sort]);

  const filteredBooks = useMemo(() => {
    const rows = (library?.books ?? []).filter((b) => !b.seriesId).filter((b) => b.title.toLowerCase().includes(query));
    return sortStandaloneBooksForLibraryBrowser(rows, sort);
  }, [library?.books, query, sort]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 3, md: 4 },
        px: { xs: 2, sm: 3, md: 4 },
        pt: { xs: 0, sm: 0, md: 4 },
        pb: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Snackbar open={toast != null} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert onClose={() => setToast(null)} severity={toast.severity} variant="filled" sx={{ width: "100%" }}>
            {toast.msg}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
      <Box
        sx={{
          mx: { xs: -2, sm: -3, md: -4 },
          mt: { xs: 0, sm: 0, md: -4 },
        }}
      >
        <LibraryHeroBanner loading={loading && !data?.library} library={library} heroBackground={heroBackground} menu={heroMenu} />
      </Box>

      <LibraryBrowserToolbar t={t} search={search} setSearch={setSearch} sort={sort} setSort={setSort} onAddBook={() => setAddBookOpen(true)} />

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
          <CircularProgress color="primary" />
        </Box>
      )}

      {filteredSeries.length > 0 && (
        <Box component="section">
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {t("sectionSeries")}
          </Typography>
          <Box sx={libraryCardGridSx}>
            {filteredSeries.map((s) => (
              <LibraryCoverCard
                key={s.id}
                id={s.id}
                title={s.title}
                coverImagePath={s.coverImagePath}
                metadata={s.metadata}
                coverUrl={getSeriesCoverUrl({ metadata: s.metadata }, s.books)}
                to={`/series/${s.id}`}
                badge={t("volBadge", { count: s.books.length })}
                onRemove={() => deleteSeries({ variables: { id: s.id } })}
                kind="series"
              />
            ))}
          </Box>
        </Box>
      )}

      {filteredBooks.length > 0 && (
        <Box component="section">
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {t("sectionStandaloneBooks")}
          </Typography>
          <Box sx={libraryCardGridSx}>
            {filteredBooks.map((b) => (
              <LibraryCoverCard
                key={b.id}
                id={b.id}
                title={b.title}
                coverImagePath={b.coverImagePath}
                metadata={b.metadata}
                readPercentage={b.readingProgressForUser != null ? b.readingProgressForUser.percentage : undefined}
                to={`/book/${b.id}`}
                onRemove={() => deleteBook({ variables: { id: b.id } })}
                kind="book"
              />
            ))}
          </Box>
        </Box>
      )}

      {!loading && filteredSeries.length === 0 && filteredBooks.length === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 12, gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {search ? t("emptyNoResults") : t("emptyLibrary")}
          </Typography>
          {!search && (
            <Button
              variant="outlined"
              onClick={() => setAddBookOpen(true)}
              sx={(th) => ({
                borderStyle: "dashed",
                borderColor: alpha(th.palette.divider, 0.5),
                color: "text.secondary",
                textTransform: "none",
                "&:hover": { borderColor: alpha(th.palette.primary.main, 0.5), color: "primary.main" },
              })}
            >
              {t("addFirstBook")}
            </Button>
          )}
        </Box>
      )}

      <AddBookModal open={addBookOpen} onClose={() => setAddBookOpen(false)} libraryId={libraryId} onCreated={() => refetch()} />
    </Box>
  );
};

export default LibraryBrowser;
