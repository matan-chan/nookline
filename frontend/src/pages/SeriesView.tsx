import { useAuth } from "../auth/AuthContext";
import { BookDetailLoadingSkeleton } from "../components/loading/BookDetailLoadingSkeleton";
import { removedBookSnackbarMessage, removedSeriesSnackbarMessage } from "../hooks/deferredDeleteSnackbarLabels";
import { useDeferredDeleteSnackbar } from "../hooks/useDeferredDeleteSnackbar";
import { isOpenLibraryEnrichmentCurrent } from "../utils/openLibrary/openLibraryMeta";
import { getSeriesCoverUrl } from "../utils/cover/cover";
import { useQuery, useMutation } from "@apollo/client";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SeriesDiscoveryHero } from "./series/SeriesDiscoveryHero";
import { SeriesVolumeCard, type SeriesVolumeBook } from "./series/SeriesVolumeCard";
import { seriesVolumeRowSx } from "./series/seriesVolumeStyles";
import { SERIES_DELETE_BOOK, SERIES_DELETE_SERIES, SERIES_ENRICH, SERIES_VIEW_QUERY } from "./series/seriesQueries";

type Series = {
  id: number;
  libraryId: number;
  title: string;
  description: string | null;
  coverImagePath: string | null;
  metadata?: string | null;
  books: SeriesVolumeBook[];
  library: { id: number; name: string };
};

const SeriesView = () => {
  const { t } = useTranslation("series");
  const { t: tc } = useTranslation("common");
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const seriesId = parseInt(id ?? "0");
  const { schedule, snackbar } = useDeferredDeleteSnackbar();
  const [hiddenBookIds, setHiddenBookIds] = useState<Set<number>>(new Set());

  const { data, loading, refetch } = useQuery<{ series: Series }>(SERIES_VIEW_QUERY, {
    variables: { id: seriesId, userId: user?.id ?? 0 },
    skip: user == null,
  });

  const [deleteSeries] = useMutation(SERIES_DELETE_SERIES);
  const [deleteBook] = useMutation(SERIES_DELETE_BOOK, { onCompleted: () => refetch() });
  const [enrichSeries] = useMutation(SERIES_ENRICH);

  const series = data?.series;

  useEffect(() => {
    if (loading || !data?.series) return;
    const raw = data.series.metadata;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      return;
    }
    if (isOpenLibraryEnrichmentCurrent(parsed.openLibrary)) return;
    let cancelled = false;
    (async () => {
      try {
        await enrichSeries({ variables: { id: seriesId } });
        if (!cancelled) refetch();
      } catch {
        /* enrichment is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, seriesId, data?.series?.metadata, enrichSeries, refetch]);

  const handleRemoveSeries = useCallback(() => {
    if (!series) return;
    schedule(
      removedSeriesSnackbarMessage(tc, series.title),
      async () => {
        await deleteSeries({ variables: { id: series.id } });
        navigate(`/library/${series.libraryId}`);
      }
    );
  }, [deleteSeries, navigate, schedule, series, tc]);

  const requestRemoveVolume = useCallback(
    (book: SeriesVolumeBook) => {
      setHiddenBookIds((prev) => new Set(prev).add(book.id));
      schedule(
        removedBookSnackbarMessage(tc, book.title),
        () => deleteBook({ variables: { id: book.id } }),
        () =>
          setHiddenBookIds((prev) => {
            const next = new Set(prev);
            next.delete(book.id);
            return next;
          })
      );
    },
    [deleteBook, schedule, tc]
  );

  const sortedBooks = useMemo(
    () =>
      [...(series?.books ?? [])]
        .filter((b) => !hiddenBookIds.has(b.id))
        .sort((a, b) => (a.volumeNumber ?? 0) - (b.volumeNumber ?? 0)),
    [hiddenBookIds, series?.books]
  );

  if (loading && !series)
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <BookDetailLoadingSkeleton />
      </Box>
    );

  if (!series)
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="body2" color="text.secondary">
          {t("notFound")}
        </Typography>
      </Box>
    );

  const seriesMeta = series.metadata
    ? (() => {
        try {
          return JSON.parse(series.metadata);
        } catch {
          return {};
        }
      })()
    : {};

  const seriesHeroCover = getSeriesCoverUrl({ metadata: series.metadata }, series.books);

  return (
    <Box
      sx={{
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 3, sm: 4, md: 5 },
        pb: { xs: 4, md: 6 },
        pt: { xs: 2, sm: 3, md: 4 },
        minHeight: "100%",
      }}
    >
      {snackbar}
      <SeriesDiscoveryHero
        series={series}
        volumeCount={series.books.length}
        libraryName={series.library.name}
        seriesMeta={seriesMeta}
        coverUrl={seriesHeroCover}
        t={t}
        onRemoveClick={handleRemoveSeries}
      />

      <Box sx={{ mx: { xs: 1.5, sm: 2.5, md: 4 } }}>
        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2, mb: 2, mt: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t("volumesHeading")}
          </Typography>
        </Box>
        <Box sx={seriesVolumeRowSx}>
          {sortedBooks.map((book) => (
            <SeriesVolumeCard key={book.id} book={book} variant="discovery" onRemove={() => requestRemoveVolume(book)} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default SeriesView;
