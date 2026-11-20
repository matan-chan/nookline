import { DETAIL_LAVENDER, DETAIL_READ_GRADIENT, DETAIL_RATING_STAR } from "../detail/detailPurpleAccent";
import { Button, IconButton, Paper, Stack, Tooltip } from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FavoriteIcon from "@mui/icons-material/Favorite";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { alpha } from "@mui/material/styles";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";

type Props = {
  bookId: number;
  t: TFunction<"book">;
  isFavorite: boolean;
  favoriteBusy: boolean;
  onToggleFavorite: () => void;
  onRemoveClick?: () => void;
};

export const BookDetailMobileStickyBar = ({ bookId, t, isFavorite, favoriteBusy, onToggleFavorite, onRemoveClick }: Props) => (
  <Paper
    elevation={8}
    sx={{
      display: { xs: "block", md: "none" },
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: (th) => th.zIndex.appBar + 1,
      borderRadius: 0,
      borderTop: (th) => `1px solid ${alpha(th.palette.divider, 0.4)}`,
      py: 1.25,
      px: 2,
      pb: "max(12px, env(safe-area-inset-bottom, 0px))",
      bgcolor: (th) => alpha(th.palette.background.paper, 0.96),
      backdropFilter: "blur(10px)",
    }}
  >
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Button
        component={Link}
        to={`/read/${bookId}`}
        variant="contained"
        fullWidth
        startIcon={<MenuBookIcon sx={{ color: "#000", fontSize: 20 }} />}
        sx={{
          flex: 1,
          background: DETAIL_READ_GRADIENT,
          color: "#000",
          fontWeight: 700,
          textTransform: "none",
          borderRadius: 999,
          minHeight: 44,
          "&:active": { transform: "scale(0.97)" },
        }}
      >
        {t("readNowShort")}
      </Button>
      <Tooltip title={isFavorite ? t("removeFromFavorites") : t("addToFavorites")}>
        <span>
          <IconButton
            onClick={onToggleFavorite}
            disabled={favoriteBusy}
            aria-pressed={isFavorite}
            sx={{ minWidth: 44, minHeight: 44, color: isFavorite ? DETAIL_RATING_STAR : "text.secondary" }}
          >
            {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        </span>
      </Tooltip>
      {onRemoveClick ? (
        <IconButton
          onClick={onRemoveClick}
          aria-label={t("removeBook")}
          sx={{ minWidth: 44, minHeight: 44, color: alpha(DETAIL_LAVENDER, 0.85) }}
        >
          <DeleteOutlineIcon />
        </IconButton>
      ) : null}
    </Stack>
  </Paper>
);