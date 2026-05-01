import { useAuth } from "../auth/AuthContext";
import DashboardLibraryCard, { type DashboardLibraryPreview } from "./dashboard/DashboardLibraryCard";
import { DashboardBookCard, type DashboardBookCover } from "./dashboard/DashboardBookCard";
import { DASHBOARD_DELETE_BOOK, DASHBOARD_HOME_QUERY } from "./dashboard/dashboardQueries";
import { dashboardCardGridSx } from "./dashboard/dashboardCardGrid";
import { staggerGridChildrenSx } from "../utils/staggerGridSx";
import type { LayoutOutletContext, LibraryNavItem } from "../components/Layout";
import { useMutation, useQuery } from "@apollo/client";
import { Box, Button, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";

type OnDeckItem = {
  book: DashboardBookCover;
  progress: { percentage: number };
};

type DashboardHomeData = {
  libraries: DashboardLibraryPreview[];
  favoriteBooks: DashboardBookCover[];
  onDeck: OnDeckItem[];
  recentlyAdded: DashboardBookCover[];
};

const SectionHeader = ({ title }: { title: string }) => (
  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
    {title}
  </Typography>
);

const Dashboard = () => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const { openAddLibrary, setLibraryPendingDelete, openEditLibrary } = useOutletContext<LayoutOutletContext>();

  const { data, refetch } = useQuery<DashboardHomeData>(DASHBOARD_HOME_QUERY, {
    variables: { userId: user?.id ?? 0 },
    skip: user == null,
  });

  const [deleteBook] = useMutation(DASHBOARD_DELETE_BOOK, {
    onCompleted: () => refetch(),
  });

  const libraries = data?.libraries ?? [];
  const favoriteBooks = data?.favoriteBooks ?? [];
  const onDeck = data?.onDeck ?? [];
  const recentlyAdded = data?.recentlyAdded ?? [];

  const removeBook = (bookId: number) => deleteBook({ variables: { id: bookId } });

  const toNavItem = (lib: DashboardLibraryPreview): LibraryNavItem => ({
    id: lib.id,
    name: lib.name,
    type: lib.type,
    path: lib.path,
    bannerIndex: lib.bannerIndex,
    customLibraryBannerId: lib.customLibraryBannerId,
  });

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2, mb: { xs: 4, md: 6 } }}>
        <Box sx={{ minWidth: 0, flex: { xs: "1 1 100%", sm: "1 1 auto" } }}>
          <Typography sx={{ typography: { xs: "h4", sm: "h3" }, fontWeight: 700, mb: 0.5 }}>
            {t("greeting")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Newsreader", serif' }}>
            {t("welcomeSubtitle")}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={openAddLibrary}
          sx={(th) => ({
            flexShrink: 0,
            width: { xs: "100%", sm: "auto" },
            borderColor: alpha(th.palette.divider, 0.5),
            color: "secondary.main",
            fontWeight: 500,
            textTransform: "none",
            "&:hover": {
              borderColor: alpha(th.palette.divider, 0.8),
              bgcolor: alpha(th.palette.mode === "light" ? th.palette.common.black : th.palette.common.white, 0.04),
            },
          })}
        >
          {t("addLibrary")}
        </Button>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {libraries.length > 0 && (
          <Box component="section">
            <SectionHeader title={t("libraries")} />
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                gap: 2,
                overflowX: "auto",
                pb: 0.5,
                mx: { xs: -2, sm: -3, md: -4 },
                px: { xs: 2, sm: 3, md: 4 },
                WebkitOverflowScrolling: "touch",
                ...staggerGridChildrenSx,
              }}
            >
              {libraries.map((lib) => (
                <DashboardLibraryCard
                  key={lib.id}
                  library={lib}
                  onRequestDelete={(l) => setLibraryPendingDelete(toNavItem(l))}
                  onEditSettings={(l) => openEditLibrary(toNavItem(l))}
                />
              ))}
            </Box>
          </Box>
        )}

        {favoriteBooks.length > 0 && (
          <Box component="section">
            <SectionHeader title={t("favorites")} />
            <Box sx={dashboardCardGridSx}>
              {favoriteBooks.map((book) => (
                <DashboardBookCard
                  key={book.id}
                  book={book}
                  percentage={book.readingProgressForUser != null ? book.readingProgressForUser.percentage : undefined}
                  onRemove={() => removeBook(book.id)}
                />
              ))}
            </Box>
          </Box>
        )}

        {onDeck.length > 0 && (
          <Box component="section">
            <SectionHeader title={t("onDeck")} />
            <Box sx={dashboardCardGridSx}>
              {onDeck.map(({ book, progress }) => (
                <DashboardBookCard key={book.id} book={book} percentage={progress.percentage} onRemove={() => removeBook(book.id)} />
              ))}
            </Box>
          </Box>
        )}

        <Box component="section">
          <SectionHeader title={t("recentlyAdded")} />
          {recentlyAdded.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 2 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  bgcolor: "background.paper",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                }}
              >
                ⊞
              </Box>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {t("emptyRecentlyAdded")}
              </Typography>
            </Box>
          ) : (
            <Box sx={dashboardCardGridSx}>
              {recentlyAdded.map((book) => (
                <DashboardBookCard
                  key={book.id}
                  book={book}
                  percentage={book.readingProgressForUser != null ? book.readingProgressForUser.percentage : undefined}
                  onRemove={() => removeBook(book.id)}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
