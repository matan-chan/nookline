import { SeriesRemoveIconButton } from "./SeriesRemoveIconButton";
import { DETAIL_LAVENDER } from "../../../../detail/detailPurpleAccent";
import { Stack, Typography } from "@mui/material";
import type { TFunction } from "i18next";

type Props = {
  title: string;
  libraryName: string;
  volumeCount: number;
  compactActions: boolean;
  onRemoveClick?: () => void;
  t: TFunction<"series">;
};

const LAVENDER_OVERLINE_BASE = {
  color: DETAIL_LAVENDER,
  letterSpacing: "0.14em",
  fontWeight: 600,
} as const;

export const SeriesHeroTitleBlock = ({ title, libraryName, volumeCount, compactActions, onRemoveClick, t }: Props) => (
  <>
    <Typography
      variant="overline"
      sx={{
        ...LAVENDER_OVERLINE_BASE,
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
      <Typography component="h1" sx={{ typography: { xs: "h5", sm: "h4", md: "h2" }, fontWeight: 800, color: "text.primary", lineHeight: 1.15 }}>
        {title}
      </Typography>
      <Typography
        component="span"
        variant="overline"
        sx={{ display: { xs: "inline", md: "none" }, ...LAVENDER_OVERLINE_BASE, fontSize: "0.65rem", lineHeight: 1.15, flexShrink: 0 }}
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
          sx={{ display: { xs: "inline", md: "none" }, ...LAVENDER_OVERLINE_BASE, fontSize: "0.65rem", lineHeight: 1.4 }}
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
  </>
);
