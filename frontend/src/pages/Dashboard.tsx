import { getDashboardGreetingKey, getHourInTimeZone } from "../timezonePreference/getHourInTimeZone";
import { useTimezonePreference } from "../TimezonePreferenceProvider";
import { useAuth } from "../auth/AuthContext";
import { type DashboardLibraryPreview } from "./dashboard/DashboardLibraryCard";
import { DashboardBookCard, type DashboardBookCover } from "./dashboard/DashboardBookCard";
import { DashboardGreetingHeader } from "./dashboard/DashboardGreetingHeader";
import { DashboardLibrariesRow } from "./dashboard/DashboardLibrariesRow";
import { DashboardRecentlyAddedSection } from "./dashboard/DashboardRecentlyAddedSection";
import { DASHBOARD_DELETE_BOOK, DASHBOARD_HOME_QUERY } from "./dashboard/dashboardQueries";
import { dashboardCardGridSx } from "./dashboard/dashboardCardGrid";
import type { LayoutOutletContext } from "../components/Layout";
import { useMutation, useQuery } from "@apollo/client";
import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";

type OnDeckItem = { book: DashboardBookCover; progress: { percentage: number } };

type DashboardHomeData = {
  libraries: DashboardLibraryPreview[];
  favoriteBooks: DashboardBookCover[];
  onDeck: OnDeckItem[];
  recentlyAdded: DashboardBookCover[];
};

const GREETING_TICK_INTERVAL_MS = 60_000;

const SectionHeader = ({ title }: { title: string }) => (
  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
    {title}
  </Typography>
);

const Dashboard = () => {
  const { t } = useTranslation("dashboard");
  const { effectiveTimeZone } = useTimezonePreference();
  const [, setGreetingTick] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const id = window.setInterval(() => setGreetingTick((x) => x + 1), GREETING_TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const greetingKey = getDashboardGreetingKey(getHourInTimeZone(new Date(), effectiveTimeZone));
  const { openAddLibrary, setLibraryPendingDelete, openEditLibrary } = useOutletContext<LayoutOutletContext>();

  const { data, refetch } = useQuery<DashboardHomeData>(DASHBOARD_HOME_QUERY, {
    variables: { userId: user?.id ?? 0 },
    skip: user == null,
  });

  const [deleteBook] = useMutation(DASHBOARD_DELETE_BOOK, { onCompleted: () => refetch() });

  const libraries = data?.libraries ?? [];
  const favoriteBooks = data?.favoriteBooks ?? [];
  const onDeck = data?.onDeck ?? [];
  const recentlyAdded = data?.recentlyAdded ?? [];

  const removeBook = (bookId: number) => deleteBook({ variables: { id: bookId } });

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <DashboardGreetingHeader t={t} greetingKey={greetingKey} username={user?.username ?? ""} onAddLibrary={openAddLibrary} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <DashboardLibrariesRow t={t} libraries={libraries} onRequestDelete={setLibraryPendingDelete} onEditSettings={openEditLibrary} />

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

        <DashboardRecentlyAddedSection t={t} recentlyAdded={recentlyAdded} onRemoveBook={removeBook} />
      </Box>
    </Box>
  );
};

export default Dashboard;
