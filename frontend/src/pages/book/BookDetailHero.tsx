import { HeroCollapsibleDescription } from "../detail/HeroCollapsibleDescription";
import { HeroCollapsibleTags } from "../detail/HeroCollapsibleTags";
import { DETAIL_LAVENDER } from "../detail/detailPurpleAccent";
import { getCoverUrl } from "../../utils/cover/cover";
import { BookDetailHeroActions } from "./BookDetailHeroActions";
import { BookDetailHeroCover } from "./BookDetailHeroCover";
import { BookDetailHeroRatingRow } from "./BookDetailHeroRatingRow";
import { TEXT_COLUMN_MAX_HEIGHT_MD } from "./bookDetailHeroConstants";
import { pickBookDescription, pickBookRatings, pickBookSubjectTags } from "./bookDetailOpenLibraryFields";
import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import type { TFunction } from "i18next";

type Book = {
  id: number;
  title: string;
  coverImagePath: string | null;
  volumeNumber: number | null;
  createdAt: string;
  seriesId: number | null;
  isFavoriteForUser: boolean;
};

type Props = {
  book: Book;
  metadata: Record<string, unknown>;
  t: TFunction<"book">;
  onRemoveClick?: () => void;
  isFavorite: boolean;
  favoriteBusy: boolean;
  onToggleFavorite: () => void;
};

export const BookDetailHero = ({
  book,
  metadata,
  t,
  onRemoveClick,
  isFavorite,
  favoriteBusy,
  onToggleFavorite,
}: Props) => {
  const theme = useTheme();
  const compactActions = useMediaQuery(theme.breakpoints.down("sm"));
  const coverUrl = getCoverUrl(book);
  const author = typeof metadata.author === "string" ? metadata.author : null;
  const description = pickBookDescription(metadata);
  const tags = pickBookSubjectTags(metadata, 6);
  const ratings = pickBookRatings(metadata);

  return (
    <Box sx={{ position: "relative", mb: { xs: 4, md: 5 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 3, md: 5 }}
        alignItems={{ xs: "center", md: "stretch" }}
        sx={{ mx: { xs: 1.5, sm: 2.5, md: 4 } }}
      >
        <BookDetailHeroCover title={book.title} coverUrl={coverUrl} />

        <Stack
          gap={{ xs: 2, md: 0 }}
          sx={{
            flex: 1,
            minWidth: 0,
            width: "100%",
            pt: { md: 0.5 },
            textAlign: { xs: "center", md: "left" },
            maxHeight: { xs: "none", md: TEXT_COLUMN_MAX_HEIGHT_MD },
            minHeight: { xs: 0, md: TEXT_COLUMN_MAX_HEIGHT_MD },
            display: "flex",
            flexDirection: "column",
            overflow: "visible",
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              overflow: { xs: "visible", md: "hidden" },
            }}
          >
            <Stack spacing={2.5} sx={{ flexShrink: 0 }}>
              <Typography
                component="h1"
                sx={{
                  typography: { xs: "h5", sm: "h4", md: "h2" },
                  fontWeight: 800,
                  color: "text.primary",
                  lineHeight: 1.15,
                }}
              >
                {book.title}
              </Typography>

              {author && (
                <Typography
                  component="p"
                  sx={{
                    fontStyle: "italic",
                    color: "text.secondary",
                    fontSize: { xs: "0.875rem", sm: "1rem", md: "1.05rem" },
                    mt: -0.5,
                  }}
                >
                  {t("byAuthor", { author })}
                </Typography>
              )}

              {ratings && <BookDetailHeroRatingRow ratings={ratings} t={t} />}

              <HeroCollapsibleTags labels={tags} seeMoreLabel={t("seeMore")} seeLessLabel={t("seeLess")} />
            </Stack>

            {description ? (
              <HeroCollapsibleDescription
                text={description}
                seeMoreLabel={t("seeMore")}
                seeLessLabel={t("seeLess")}
                lineClamp={{ xs: 2, sm: 3, md: 4 }}
                toggleSx={{ color: DETAIL_LAVENDER }}
              />
            ) : null}
          </Box>

          <BookDetailHeroActions
            book={book}
            compactActions={compactActions}
            t={t}
            onRemoveClick={onRemoveClick}
            isFavorite={isFavorite}
            favoriteBusy={favoriteBusy}
            onToggleFavorite={onToggleFavorite}
          />
        </Stack>
      </Stack>
    </Box>
  );
};
