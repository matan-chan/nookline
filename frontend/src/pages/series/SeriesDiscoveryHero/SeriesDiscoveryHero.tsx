import { SeriesHeroTitleBlock } from "./components/title/SeriesHeroTitleBlock";
import { SeriesRemoveIconButton } from "./components/title/SeriesRemoveIconButton";
import { SeriesHeroCover } from "./components/SeriesHeroCover";
import { HeroCollapsibleDescription } from "../../detail/HeroCollapsibleDescription";
import { HeroCollapsibleTags } from "../../detail/HeroCollapsibleTags";
import { pickBookDescription, pickBookSubjectTags } from "../../book/bookDetailOpenLibraryFields";
import { DETAIL_LAVENDER } from "../../detail/detailPurpleAccent";
import { Box, Stack, useMediaQuery, useTheme } from "@mui/material";
import type { TFunction } from "i18next";

const HERO_TAG_LIMIT = 6;

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
  const tags = pickBookSubjectTags(seriesMeta, HERO_TAG_LIMIT);

  return (
    <Box sx={{ position: "relative", mb: { xs: 4, md: 5 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 3, md: 5 }}
        alignItems={{ xs: "center", md: "flex-start" }}
        sx={{ mx: { xs: 1.5, sm: 2.5, md: 4 } }}
      >
        <SeriesHeroCover title={series.title} coverUrl={coverUrl} />

        <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flex: 1, minWidth: 0, width: "100%", pt: { md: 0.5 }, textAlign: { xs: "center", md: "left" } }}>
          <SeriesHeroTitleBlock
            title={series.title}
            libraryName={libraryName}
            volumeCount={volumeCount}
            compactActions={compactActions}
            onRemoveClick={onRemoveClick}
            t={t}
          />

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
