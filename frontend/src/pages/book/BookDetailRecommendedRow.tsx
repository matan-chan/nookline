import { pickVolumeCardSubtitle } from "../series/seriesVolumeSubtitle";
import { seriesVolumeRowSx } from "../series/seriesVolumeStyles";
import { BookCoverImg } from "../../components/BookCoverImg";
import { COVER_SIZES_RECOMMENDED, getCoverUrl, getFileExt } from "../../utils/cover/cover";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export type RecommendedBookCard = {
  id: number;
  title: string;
  coverImagePath: string | null;
  fileExt?: string | null;
  metadata: string | null;
  createdAt: string;
};

type Props = { books: RecommendedBookCard[] };

const recommendedRowScrollSx = {
  ...seriesVolumeRowSx,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": { display: "none" },
  scrollSnapType: "x mandatory",
  WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%)",
  maskImage: "linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%)",
};

export const BookDetailRecommendedRow = ({ books }: Props) => {
  const { t } = useTranslation("book");
  if (books.length === 0) return null;

  return (
    <Box sx={{ mt: { xs: 3, md: 4 }, mx: { xs: 1.5, sm: 2.5, md: 4 } }}>
      <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 700, color: "text.primary", letterSpacing: "0.04em" }}>
        {t("recommendedBooks")}
      </Typography>
      <Box sx={recommendedRowScrollSx}>
        {books.map((book) => {
          const coverUrl = getCoverUrl(book);
          const subtitle = pickVolumeCardSubtitle(book);
          return (
            <Box
              key={book.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                flex: "0 0 auto",
                width: { xs: 132, sm: 148 },
                minWidth: { xs: 132, sm: 148 },
                scrollSnapAlign: "start",
                "&:hover .rec-cover": { transform: "scale(1.02)" },
              }}
            >
              <Box
                className="rec-cover"
                sx={{
                  position: "relative",
                  aspectRatio: "2/3",
                  width: "100%",
                  borderRadius: 3,
                  overflow: "hidden",
                  bgcolor: "background.paper",
                  transition: "transform 0.22s ease",
                }}
              >
                <Box component={Link} to={`/book/${book.id}`} sx={{ position: "absolute", inset: 0, display: "block" }}>
                  {coverUrl || getFileExt(book) === "pdf" ? (
                    <BookCoverImg
                      bookId={book.id}
                      fileExt={getFileExt(book)}
                      src={coverUrl ?? ""}
                      alt={book.title}
                      sizes={COVER_SIZES_RECOMMENDED}
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
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
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          textAlign: "center",
                          fontSize: "0.625rem",
                          lineHeight: 1.2,
                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {book.title}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              <Typography
                component={Link}
                to={`/book/${book.id}`}
                variant="caption"
                textAlign="left"
                sx={{
                  width: "100%",
                  textDecoration: "none",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  color: "text.primary",
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  "&:hover": { color: "text.primary" },
                }}
              >
                {book.title}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.65rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  textAlign: "left",
                  lineHeight: 1.3,
                  mt: -0.25,
                }}
              >
                {subtitle}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
