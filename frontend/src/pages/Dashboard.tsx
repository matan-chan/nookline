import { getDashboardGreetingKey, getHourInTimeZone } from "../timezonePreference/getHourInTimeZone";
import { useTimezonePreference } from "../TimezonePreferenceProvider";
import { useAuth } from "../auth/AuthContext";
import { removedBookSnackbarMessage } from "../hooks/deferredDeleteSnackbarLabels";
import { useDeferredDeleteSnackbar } from "../hooks/useDeferredDeleteSnackbar";
import { type DashboardLibraryPreview } from "./dashboard/DashboardLibraryCard";
import { DashboardBookCard, type DashboardBookCover } from "./dashboard/DashboardBookCard";
import { DashboardContinueReadingCard } from "./dashboard/DashboardContinueReadingCard";
import { DashboardGreetingHeader } from "./dashboard/DashboardGreetingHeader";
import { DashboardLibrariesRow } from "./dashboard/DashboardLibrariesRow";
import { DashboardRecentlyAddedSection } from "./dashboard/DashboardRecentlyAddedSection";
import { DASHBOARD_DELETE_BOOK, DASHBOARD_HOME_QUERY } from "./dashboard/dashboardQueries";
import { dashboardCardGridSx } from "./dashboard/dashboardCardGrid";
import type { LayoutOutletContext } from "../components/Layout";
import { useMutation, useQuery } from "@apollo/client";
import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const { t: tc } = useTranslation("common");
  const { effectiveTimeZone } = useTimezonePreference();
  const [, setGreetingTick] = useState(0);
  const { user } = useAuth();
  const { schedule, snackbar } = useDeferredDeleteSnackbar();
  const [hiddenBookIds, setHiddenBookIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const id = window.setInterval(() => setGreetingTick((x) => x + 1), GREETING_TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const greetingKey = getDashboardGreetingKey(getHourInTimeZone(new Date(), effectiveTimeZone));
  const { openAddLibrary, setLibraryPendingDelete, openEditLibrary } = useOutletContext<LayoutOutletContext>();

  const { data, refetch } = useQuery<DashboardHomeData>(DASHBOARD_HOME_QUERY, {
    variables: { userId: user?.id ?? 0 },
    skip: user == null,
    errorPolicy: "all",
  });

  const [deleteBook] = useMutation(DASHBOARD_DELETE_BOOK, { onCompleted: () => refetch() });

  const hideBook = useCallback((id: number) => {
    setHiddenBookIds((prev) => new Set(prev).add(id));
  }, []);

  const unhideBook = useCallback((id: number) => {
    setHiddenBookIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const requestRemoveBook = useCallback(
    (book: DashboardBookCover) => {
      hideBook(book.id);
      schedule(
        removedBookSnackbarMessage(tc, book.title),
        () => deleteBook({ variables: { id: book.id } }),
        () => unhideBook(book.id)
      );
    },
    [deleteBook, hideBook, schedule, tc, unhideBook]
  );

  const filterVisible = useCallback(
    <T extends { id: number }>(rows: T[]) => rows.filter((b) => !hiddenBookIds.has(b.id)),
    [hiddenBookIds]
  );

  const libraries = data?.libraries ?? [];
  const favoriteBooks = useMemo(() => filterVisible(data?.favoriteBooks ?? []), [data?.favoriteBooks, filterVisible]);
  const onDeck = useMemo(
    () => (data?.onDeck ?? []).filter((item) => !hiddenBookIds.has(item.book.id)),
    [data?.onDeck, hiddenBookIds]
  );
  const recentlyAdded = useMemo(() => filterVisible(data?.recentlyAdded ?? []), [data?.recentlyAdded, filterVisible]);

  const continueItem = onDeck[0] ?? null;
  const onDeckRest = onDeck.slice(1);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {snackbar}
      <DashboardGreetingHeader t={t} greetingKey={greetingKey} username={user?.username ?? ""} onAddLibrary={openAddLibrary} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {continueItem ? (
          <DashboardContinueReadingCard t={t} book={continueItem.book} percentage={continueItem.progress.percentage} />
        ) : null}

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
                  onRemove={() => requestRemoveBook(book)}
                />
              ))}
            </Box>
          </Box>
        )}

        {onDeckRest.length > 0 && (
          <Box component="section">
            <SectionHeader title={t("onDeck")} />
            <Box sx={dashboardCardGridSx}>
              {onDeckRest.map(({ book, progress }) => (
                <DashboardBookCard key={book.id} book={book} percentage={progress.percentage} onRemove={() => requestRemoveBook(book)} />
              ))}
            </Box>
          </Box>
        )}

        <DashboardRecentlyAddedSection
          t={t}
          recentlyAdded={recentlyAdded}
          onRemoveBook={(id) => {
            const book = (data?.recentlyAdded ?? []).find((b) => b.id === id);
            if (book) requestRemoveBook(book);
          }}
        />
      </Box>
    </Box>
  );
};

export default Dashboard;