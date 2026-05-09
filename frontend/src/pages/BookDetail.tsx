import { useAuth } from "../auth/AuthContext";
import { useCoverAmbientBackground } from "../hooks/useCoverAmbientBackground";
import ConfirmModal from "../components/ConfirmModal";
import { isOpenLibraryEnrichmentCurrent } from "../utils/openLibrary/openLibraryMeta";
import { getCoverUrl } from "../utils/cover/cover";
import { BookDetailRecommendedRow } from "./book/BookDetailRecommendedRow";
import { BookDetailHero } from "./book/BookDetailHero";
import {
  BOOK_DETAIL_DELETE_BOOK,
  BOOK_DETAIL_ENRICH,
  BOOK_DETAIL_QUERY,
  BOOK_DETAIL_SET_FAVORITE,
} from "./book/bookDetailQueries";
import { useQuery, useMutation } from "@apollo/client";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

type RecommendedBook = {
  id: number;
  title: string;
  coverImagePath: string | null;
  metadata: string | null;
  createdAt: string;
};

type Book = {
  id: number;
  title: string;
  coverImagePath: string | null;
  volumeNumber: number | null;
  metadata: string | null;
  createdAt: string;
  seriesId: number | null;
  libraryId: number;
  isFavoriteForUser: boolean;
  library: { id: number; name: string };
  series: { id: number; title: string } | null;
};

type BookDetailQueryData = { book: Book; recommendedBooksForBook: RecommendedBook[] };

const BookDetail = () => {
  const { t } = useTranslation("book");
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const parsedId = parseInt(id ?? "0", 10);
  const bookId = Number.isFinite(parsedId) ? parsedId : 0;
  const navigate = useNavigate();
  const [removeOpen, setRemoveOpen] = useState(false);

  const { data, loading, refetch } = useQuery<BookDetailQueryData>(BOOK_DETAIL_QUERY, {
    variables: { id: bookId, userId: user?.id ?? 0 },
    skip: user == null || bookId < 1,
    fetchPolicy: "cache-and-network",
  });
  const [deleteBook, { loading: deleting }] = useMutation(BOOK_DETAIL_DELETE_BOOK);
  const [enrichBook] = useMutation(BOOK_DETAIL_ENRICH);
  const [setFavorite, { loading: favoriteBusy }] = useMutation(BOOK_DETAIL_SET_FAVORITE, {
    onCompleted: () => refetch(),
  });

  const book = data?.book;
  const metadata = book?.metadata
    ? (() => {
        try {
          return JSON.parse(book.metadata);
        } catch {
          return {};
        }
      })()
    : {};

  useEffect(() => {
    if (loading || !data?.book) return;
    const raw = data.book.metadata;
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
        await enrichBook({ variables: { id: bookId } });
        if (!cancelled) refetch();
      } catch {
        /* enrichment is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, bookId, data?.book?.metadata, enrichBook, refetch]);

  const coverUrlForAmbient = book ? getCoverUrl(book) : null;
  const ambientBackground = useCoverAmbientBackground(coverUrlForAmbient);

  const handleRemoveConfirm = async () => {
    if (!book) return;
    await deleteBook({ variables: { id: book.id } });
    setRemoveOpen(false);
    navigate(book.seriesId ? `/series/${book.seriesId}` : `/library/${book.libraryId}`);
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );

  if (!book)
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Typography variant="body2" color="text.secondary">
          {t("notFound")}
        </Typography>
      </Box>
    );

  return (
    <Box
      sx={{
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 3, sm: 4, md: 5 },
        pb: { xs: 4, md: 6 },
        pt: { xs: 2, sm: 3, md: 4 },
        minHeight: "100vh",
        transition: "background-color 0.45s ease, background-image 0.45s ease",
        ...ambientBackground,
      }}
    >
      <BookDetailHero
        book={book}
        metadata={metadata}
        t={t}
        onRemoveClick={() => setRemoveOpen(true)}
        isFavorite={book.isFavoriteForUser}
        favoriteBusy={favoriteBusy}
        onToggleFavorite={() =>
          setFavorite({
            variables: { userId: user?.id ?? 0, bookId: book.id, liked: !book.isFavoriteForUser },
          })
        }
      />

      <BookDetailRecommendedRow key={book.id} books={data?.recommendedBooksForBook ?? []} />

      <ConfirmModal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onConfirm={handleRemoveConfirm}
        title={t("removeBookTitle")}
        message={t("removeBookMessage", { title: book.title })}
        confirmLabel={t("removeBookConfirm")}
        loading={deleting}
      />
    </Box>
  );
};

export default BookDetail;
