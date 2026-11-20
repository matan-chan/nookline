import { BookCoverImg } from "../../components/BookCoverImg";
import BookCoverProgressBar from "../../components/BookCoverProgressBar";
import CardOverflowMenu from "../../components/CardOverflowMenu";
import { coverCardColumnHoverSx } from "../../utils/layout/staggerGridSx";
import { getCoverUrl, getFileExt } from "../../utils/cover/cover";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "react-router-dom";

export type DashboardBookCover = {
  id: number;
  title: string;
  coverImagePath: string | null;
  fileExt?: string | null;
  metadata: string | null;
  createdAt?: string;
  readingProgressForUser?: { percentage: number } | null;
};

export const DashboardBookCard = ({ book, percentage, onRemove }: { book: DashboardBookCover; percentage?: number; onRemove: () => void }) => {
  const coverUrl = getCoverUrl(book);
  const fileExt = getFileExt(book);
  return (
    <Box sx={coverCardColumnHoverSx}>
      <Box
        className="cover"
        sx={{
          position: "relative",
          aspectRatio: "2/3",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
          transition: "transform 0.2s ease",
          boxShadow: `0 0 40px 0 ${alpha("#ba9eff", 0.08)}`,
        }}
      >
        <Box component={Link} to={`/book/${book.id}`} sx={{ position: "absolute", inset: 0, zIndex: 0, display: "block" }}>
          {coverUrl || fileExt === "pdf" ? (
            <BookCoverImg bookId={book.id} fileExt={fileExt} src={coverUrl ?? ""} alt={book.title} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Box
              sx={(t) => ({
                display: "flex",
                height: "100%",
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: t.surfaces.high,
                px: 1,
              })}
            >
              <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {book.title}
              </Typography>
            </Box>
          )}
        </Box>
        <CardOverflowMenu onRemove={onRemove} variant="book" itemTitle={book.title} />
        {percentage !== undefined && percentage !== null && <BookCoverProgressBar percentage={percentage} />}
      </Box>
      <Typography
        component={Link}
        to={`/book/${book.id}`}
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
        {book.title}
      </Typography>
    </Box>
  );
};
