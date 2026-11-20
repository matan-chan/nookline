import { BookCoverImg } from "../../components/BookCoverImg";
import BookCoverProgressBar from "../../components/BookCoverProgressBar";
import CardOverflowMenu from "../../components/CardOverflowMenu";
import { COVER_SIZES_VOLUME, getCoverUrl, getFileExt } from "../../utils/cover/cover";
import { coverCardColumnHoverSx } from "../../utils/layout/staggerGridSx";
import { DETAIL_LAVENDER } from "../detail/detailPurpleAccent";
import { pickVolumeCardSubtitle } from "./seriesVolumeSubtitle";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export type SeriesVolumeBook = {
  id: number;
  title: string;
  volumeNumber: number | null;
  coverImagePath: string | null;
  fileExt?: string | null;
  metadata?: string | null;
  createdAt: string;
  readingProgressForUser?: { percentage: number } | null;
};

export const SeriesVolumeCard = ({
  book,
  onRemove,
  variant = "default",
}: {
  book: SeriesVolumeBook;
  onRemove: () => void;
  variant?: "default" | "discovery";
}) => {
  const { t } = useTranslation("book");
  const coverUrl = getCoverUrl(book);
  const fileExt = getFileExt(book);
  const isDiscovery = variant === "discovery";
  const subtitle = isDiscovery ? pickVolumeCardSubtitle(book) : null;

  return (
    <Box
      sx={{
        flex: isDiscovery ? "0 0 auto" : undefined,
        width: isDiscovery ? { xs: 132, sm: 148 } : undefined,
        minWidth: isDiscovery ? { xs: 132, sm: 148 } : undefined,
        ...coverCardColumnHoverSx,
      }}
    >
      <Box
        className="cover"
        sx={{
          position: "relative",
          aspectRatio: "2/3",
          width: "100%",
          borderRadius: isDiscovery ? 3 : 2,
          overflow: "hidden",
          bgcolor: "background.paper",
          transition: "transform 0.22s ease",
        }}
      >
        <Box component={Link} to={`/book/${book.id}`} sx={{ position: "absolute", inset: 0, zIndex: 0, display: "block" }}>
          {coverUrl || fileExt === "pdf" ? (
            <BookCoverImg
              bookId={book.id}
              fileExt={fileExt}
              src={coverUrl ?? ""}
              alt={book.title}
              sizes={COVER_SIZES_VOLUME}
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
                {book.volumeNumber != null ? t("vol", { volume: book.volumeNumber }) : book.title}
              </Typography>
            </Box>
          )}
        </Box>
        {book.volumeNumber !== null && (
          <Typography
            variant="caption"
            sx={(th) => ({
              pointerEvents: "none",
              position: "absolute",
              top: 6,
              left: 6,
              zIndex: 6,
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              bgcolor: alpha(th.surfaces.highest, 0.88),
              color: "text.secondary",
              fontSize: "0.625rem",
            })}
          >
            {t("vol", { volume: book.volumeNumber })}
          </Typography>
        )}
        {book.readingProgressForUser != null && <BookCoverProgressBar percentage={book.readingProgressForUser.percentage} />}
        <CardOverflowMenu onRemove={onRemove} variant="volume" itemTitle={book.title} />
      </Box>
      <Typography
        component={Link}
        to={`/book/${book.id}`}
        variant="caption"
        textAlign={isDiscovery ? "left" : "center"}
        sx={{
          width: "100%",
          textDecoration: "none",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          color: isDiscovery ? "text.primary" : "text.secondary",
          fontWeight: isDiscovery ? 600 : 400,
          fontSize: isDiscovery ? "0.8125rem" : undefined,
          "&:hover": { color: "text.primary" },
        }}
      >
        {book.title}
      </Typography>
      {isDiscovery && subtitle && (
        <Typography
          variant="caption"
          sx={{
            color: isDiscovery ? DETAIL_LAVENDER : "text.secondary",
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
      )}
    </Box>
  );
};
