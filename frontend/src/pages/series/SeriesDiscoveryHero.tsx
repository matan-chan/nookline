import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { HeroCollapsibleDescription } from "../detail/HeroCollapsibleDescription";
import { HeroCollapsibleTags } from "../detail/HeroCollapsibleTags";
import { pickBookDescription, pickBookSubjectTags } from "../book/bookDetailOpenLibraryFields";
import { DETAIL_COVER_GLOW, DETAIL_LAVENDER } from "../detail/detailPurpleAccent";
import { BookCoverImg } from "../../components/BookCoverImg";
import { COVER_SIZES_HERO } from "../../utils/cover";
import type { SxProps, Theme } from "@mui/material/styles";
import { Box, IconButton, Stack, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import type { TFunction } from "i18next";

type SeriesRemoveIconButtonProps = {
  compact: boolean;
  onRemove: () => void;
  t: TFunction<"series">;
  sx?: SxProps<Theme>;
};

const SeriesRemoveIconButton = ({ compact, onRemove, t, sx }: SeriesRemoveIconButtonProps) => (
  <Tooltip title={t("removeSeries")}>
    <IconButton
      type="button"
      color="error"
      onClick={onRemove}
      aria-label={t("removeSeries")}
      size={compact ? "small" : "medium"}
      sx={{ flexShrink: 0, ...sx }}
    >
      <DeleteOutlineIcon fontSize={compact ? "small" : "medium"} />
    </IconButton>
  </Tooltip>
);

type Series = {
  id: number;
  title: string;
  description: string | null;
};

type Props = {
  series: Series;
  volumeCount: number;
  libraryName: string;
  seriesMeta: Record<string, unknown>;
  coverUrl: string | null;
  t: TFunction<"series">;
  onRemoveClick?: () => void;
};

export const SeriesDiscoveryHero = ({ series, volumeCount, libraryName, seriesMeta, coverUrl, t, onRemoveClick }: Props) => {
  const theme = useTheme();
  const compactActions = useMediaQuery(theme.breakpoints.down("sm"));
  const description = pickBookDescription(seriesMeta) || (series.description?.trim() || null);
  const tags = pickBookSubjectTags(seriesMeta, 6);

  return (
    <Box sx={{ position: "relative", mb: { xs: 4, md: 5 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 3, md: 5 }}
        alignItems={{ xs: "center", md: "flex-start" }}
        sx={{ mx: { xs: 1.5, sm: 2.5, md: 4 } }}
      >
        <Box
          sx={{
            width: { xs: 240, sm: 280, md: 320 },
            flexShrink: 0,
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "background.paper",
            boxShadow: DETAIL_COVER_GLOW,
            aspectRatio: "2/3",
          }}
        >
          {coverUrl ? (
            <BookCoverImg
              src={coverUrl}
              alt={series.title}
              sizes={COVER_SIZES_HERO}
              loading="eager"
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", px: 1.5 }}>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {series.title}
              </Typography>
            </Box>
          )}
        </Box>

        <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flex: 1, minWidth: 0, width: "100%", pt: { md: 0.5 }, textAlign: { xs: "center", md: "left" } }}>
          <Typography
            variant="overline"
            sx={{
              color: DETAIL_LAVENDER,
              letterSpacing: "0.14em",
              fontWeight: 600,
              fontSize: { xs: "0.65rem", md: "0.7rem" },
              lineHeight: 1.4,
              display: { xs: "none", md: "block" },
            }}
          >
            {`${t("seriesLabel").toUpperCase()} • ${libraryName.toUpperCase()}`}
          </Typography>

          <Stack
            direction={{ xs: "row", md: "column" }}
            alignItems={{ xs: "baseline", md: "stretch" }}
            justifyContent={{ xs: "center", md: "flex-start" }}
            columnGap={{ xs: 1, md: 0 }}
            rowGap={{ xs: 0.5, md: 0 }}
            flexWrap="wrap"
          >
            <Typography
              component="h1"
              sx={{
                typography: { xs: "h5", sm: "h4", md: "h2" },
                fontWeight: 800,
                color: "text.primary",
                lineHeight: 1.15,
              }}
            >
              {series.title}
            </Typography>
            <Typography
              component="span"
              variant="overline"
              sx={{
                display: { xs: "inline", md: "none" },
                color: DETAIL_LAVENDER,
                letterSpacing: "0.14em",
                fontWeight: 600,
                fontSize: "0.65rem",
                lineHeight: 1.15,
                flexShrink: 0,
              }}
            >
              {libraryName.toUpperCase()}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent={{ xs: "center", md: "flex-start" }}
            flexWrap="wrap"
            columnGap={{ xs: 0.5, md: 0 }}
            rowGap={0.5}
            sx={{ width: "100%" }}
          >
            <Stack direction="row" alignItems="center" flexWrap="wrap" columnGap={1}>
              <Typography
                variant="overline"
                sx={{
                  display: { xs: "inline", md: "none" },
                  color: DETAIL_LAVENDER,
                  letterSpacing: "0.14em",
                  fontWeight: 600,
                  fontSize: "0.65rem",
                  lineHeight: 1.4,
                }}
              >
                {t("seriesLabel").toUpperCase()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                {t("volumeCount", { count: volumeCount })}
              </Typography>
            </Stack>
            {onRemoveClick ? (
              <SeriesRemoveIconButton
                compact={compactActions}
                onRemove={onRemoveClick}
                t={t}
                sx={{ display: { xs: "inline-flex", md: "none" }, ml: { xs: -0.25 } }}
              />
            ) : null}
          </Stack>

          <HeroCollapsibleTags labels={tags} seeMoreLabel={t("seeMore")} seeLessLabel={t("seeLess")} />

          {description ? (
            <HeroCollapsibleDescription
              text={description}
              seeMoreLabel={t("seeMore")}
              seeLessLabel={t("seeLess")}
              lineClamp={{ xs: 2, sm: 3, md: 4 }}
              toggleSx={{ color: DETAIL_LAVENDER }}
            />
          ) : null}

          {onRemoveClick ? (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent={{ xs: "center", md: "flex-start" }}
              sx={{ display: { xs: "none", md: "flex" }, pt: { md: 0 } }}
            >
              <SeriesRemoveIconButton compact={compactActions} onRemove={onRemoveClick} t={t} />
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
};
