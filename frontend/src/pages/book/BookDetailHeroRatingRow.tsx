import { DETAIL_RATING_STAR } from "../detail/detailPurpleAccent";
import { Box, Rating, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { TFunction } from "i18next";

const formatReviewCount = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
};

type Ratings = { average: number; count: number };

type Props = {
  ratings: Ratings;
  t: TFunction<"book">;
};

export const BookDetailHeroRatingRow = ({ ratings, t }: Props) => (
  <Stack
    direction="row"
    flexWrap="wrap"
    alignItems="center"
    justifyContent={{ xs: "center", md: "flex-start" }}
    spacing={1.5}
    sx={{ gap: 1 }}
  >
    <Rating
      name="book-rating"
      value={Math.min(5, Math.max(0, ratings.average))}
      precision={0.1}
      readOnly
      size="small"
      sx={(th) => ({
        "& .MuiRating-iconFilled": { color: DETAIL_RATING_STAR },
        "& .MuiRating-iconEmpty": { color: alpha(th.palette.text.primary, 0.22) },
      })}
    />
    <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 500, fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
      {ratings.average.toFixed(1)}
      {ratings.count > 0 && (
        <Box component="span" sx={{ color: "text.secondary", fontWeight: 400, ml: 0.75 }}>
          ({formatReviewCount(ratings.count)} {t("reviews")})
        </Box>
      )}
    </Typography>
  </Stack>
);
