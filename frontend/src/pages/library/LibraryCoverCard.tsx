import { BookCoverImg } from "../../components/BookCoverImg";
import BookCoverProgressBar from "../../components/BookCoverProgressBar";
import CardOverflowMenu from "../../components/CardOverflowMenu";
import { getCoverUrl } from "../../utils/cover";
import { coverCardColumnHoverSx, staggerGridChildrenSx } from "../../utils/staggerGridSx";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "react-router-dom";

export const libraryCardGridSx = {
  display: "grid",
  gap: 2,
  gridTemplateColumns: {
    xs: "repeat(2, 1fr)",
    sm: "repeat(3, 1fr)",
    md: "repeat(4, 1fr)",
    lg: "repeat(6, 1fr)",
  },
  ...staggerGridChildrenSx,
};

export const LibraryCoverCard = ({
  id,
  title,
  coverImagePath,
  metadata,
  coverUrl: coverOverride,
  readPercentage,
  to,
  badge,
  onRemove,
  kind,
}: {
  id: number;
  title: string;
  coverImagePath: string | null;
  metadata?: string | null;
  coverUrl?: string | null;
  readPercentage?: number | null;
  to: string;
  badge?: string;
  onRemove: () => void;
  kind: "book" | "series";
}) => {
  const coverUrl = coverOverride ?? getCoverUrl({ id, coverImagePath, metadata });
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
        }}
      >
        <Box component={Link} to={to} sx={{ position: "absolute", inset: 0, zIndex: 0, display: "block" }}>
          {coverUrl ? (
            <BookCoverImg src={coverUrl} alt={title} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Box sx={(t) => ({ display: "flex", height: "100%", width: "100%", alignItems: "center", justifyContent: "center", bgcolor: t.surfaces.high, px: 1 })}>
              <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {title}
              </Typography>
            </Box>
          )}
        </Box>
        <CardOverflowMenu onRemove={onRemove} variant={kind === "series" ? "series" : "book"} itemTitle={title} />
        {badge && (
          <Typography
            variant="caption"
            sx={(t) => ({
              pointerEvents: "none",
              position: "absolute",
              top: 8,
              right: 40,
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              bgcolor: alpha(t.surfaces.highest, 0.85),
              color: "text.secondary",
              fontSize: "0.625rem",
            })}
          >
            {badge}
          </Typography>
        )}
        {kind === "book" && readPercentage != null && <BookCoverProgressBar percentage={readPercentage} />}
      </Box>
      <Typography
        component={Link}
        to={to}
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
        {title}
      </Typography>
    </Box>
  );
};
