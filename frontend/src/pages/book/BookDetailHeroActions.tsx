import { DETAIL_LAVENDER, DETAIL_RATING_STAR, DETAIL_READ_GRADIENT } from "../detail/detailPurpleAccent";
import { Box, Button, IconButton, Stack, Tooltip } from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { HERO_ACTIONS_GAP_PX } from "./bookDetailHeroConstants";
import FavoriteIcon from "@mui/icons-material/Favorite";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { alpha } from "@mui/material/styles";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";

type Book = {
  id: number;
  seriesId: number | null;
};

type Props = {
  book: Book;
  compactActions: boolean;
  t: TFunction<"book">;
  onRemoveClick?: () => void;
  isFavorite: boolean;
  favoriteBusy: boolean;
  onToggleFavorite: () => void;
};

export const BookDetailHeroActions = ({ book, compactActions, t, onRemoveClick, isFavorite, favoriteBusy, onToggleFavorite }: Props) => (
  <Box
    sx={{
      flexShrink: 0,
      pt: { xs: 1, md: 0 },
      mt: { xs: 0, md: `${HERO_ACTIONS_GAP_PX}px` },
      overflow: "visible",
      px: { md: 0.5 },
      py: { md: 0.75 },
    }}
  >
    <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent={{ xs: "center", md: "flex-start" }} spacing={{ xs: 1, sm: 1.5 }} sx={{ gap: { xs: 1, sm: 1.5 } }}>
      <Button
        component={Link}
        to={`/read/${book.id}`}
        variant="contained"
        size={compactActions ? "medium" : "large"}
        startIcon={<MenuBookIcon sx={{ color: "#000", fontSize: compactActions ? 18 : 24 }} />}
        sx={{
          background: DETAIL_READ_GRADIENT,
          color: "#000",
          fontWeight: 700,
          textTransform: "none",
          textDecoration: "none",
          borderRadius: 999,
          px: { xs: 2, sm: 2.5, md: 3 },
          py: { xs: 0.75, md: 1.25 },
          fontSize: { xs: "0.8125rem", md: "0.9375rem" },
          minHeight: { xs: 36, md: 48 },
          boxShadow: (th) => `0 8px 28px ${alpha("#7c3aed", th.palette.mode === "dark" ? 0.28 : 0.38)}`,
          "&:hover": {
            background: DETAIL_READ_GRADIENT,
            opacity: 0.95,
          },
          "&:active": { transform: "scale(0.97)" },
        }}
      >
        {compactActions ? t("readNowShort") : t("readNow")}
      </Button>

      <Tooltip title={isFavorite ? t("removeFromFavorites") : t("addToFavorites")}>
        <span>
          <IconButton
            type="button"
            onClick={onToggleFavorite}
            disabled={favoriteBusy}
            aria-pressed={isFavorite}
            size={compactActions ? "small" : "medium"}
            aria-label={isFavorite ? t("removeFromFavorites") : t("addToFavorites")}
            sx={{
              bgcolor: "transparent",
              border: "none",
              color: isFavorite ? DETAIL_RATING_STAR : "text.secondary",
              "&:hover": { bgcolor: alpha(DETAIL_LAVENDER, 0.08), border: "none" },
            }}
          >
            {isFavorite ? <FavoriteIcon fontSize={compactActions ? "small" : "medium"} /> : <FavoriteBorderIcon fontSize={compactActions ? "small" : "medium"} />}
          </IconButton>
        </span>
      </Tooltip>

      {book.seriesId != null && (
        <Button
          component={Link}
          to={`/series/${book.seriesId}`}
          variant="text"
          size="small"
          sx={{
            color: DETAIL_LAVENDER,
            textTransform: "none",
            fontWeight: 600,
            fontSize: { xs: "0.8125rem", md: "0.875rem" },
            minWidth: 0,
            px: { xs: 0.75, md: 1 },
            textDecoration: "none",
            "&:hover": { bgcolor: alpha(DETAIL_LAVENDER, 0.12) },
          }}
        >
          {compactActions ? t("viewSeriesShort") : t("viewSeries")}
        </Button>
      )}

      {onRemoveClick ? (
        <Tooltip title={t("removeBook")}>
          <IconButton type="button" color="error" onClick={onRemoveClick} aria-label={t("removeBook")} size={compactActions ? "small" : "medium"} sx={{ ml: { xs: 0, sm: 0.5 } }}>
            <DeleteOutlineIcon fontSize={compactActions ? "small" : "medium"} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Stack>
  </Box>
);
