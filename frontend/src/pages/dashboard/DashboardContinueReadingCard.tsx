import { BookCoverImg } from "../../components/BookCoverImg";
import { getCoverUrl, getFileExt } from "../../utils/cover/cover";
import { DETAIL_READ_GRADIENT } from "../detail/detailPurpleAccent";
import type { DashboardBookCover } from "./DashboardBookCard";
import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";

type Props = {
  t: TFunction<"dashboard">;
  book: DashboardBookCover;
  percentage: number;
};

export const DashboardContinueReadingCard = ({ t, book, percentage }: Props) => {
  const coverUrl = getCoverUrl(book);
  const fileExt = getFileExt(book);
  const pct = Math.min(100, Math.max(0, percentage));

  return (
    <Box
      component="section"
      sx={(th) => ({
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 2, sm: 3 },
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        bgcolor: alpha(th.surfaces.container, 0.65),
        border: `1px solid ${alpha(th.palette.divider, 0.35)}`,
      })}
    >
      <Box
        sx={{
          width: { xs: 140, sm: 152 },
          alignSelf: { xs: "center", sm: "flex-start" },
          flexShrink: 0,
          aspectRatio: "2/3",
          borderRadius: 2.5,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        {coverUrl || fileExt === "pdf" ? (
          <BookCoverImg
            bookId={book.id}
            fileExt={fileExt}
            src={coverUrl ?? ""}
            alt={book.title}
            loading="eager"
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </Box>
      <Stack sx={{ flex: 1, minWidth: 0, justifyContent: "center", textAlign: { xs: "center", sm: "left" } }} spacing={1.5}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.08em", fontWeight: 700 }}>
          {t("continueReading")}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.15, overflowWrap: "anywhere" }}>
          {book.title}
        </Typography>
        <Box sx={{ maxWidth: 360, mx: { xs: "auto", sm: 0 }, width: "100%" }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t("readingProgress")}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {Math.round(pct)}%
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 999 }} />
        </Box>
        <Box sx={{ pt: 0.5 }}>
          <Button
            component={Link}
            to={`/read/${book.id}`}
            variant="contained"
            size="large"
            startIcon={<MenuBookIcon sx={{ color: "#000" }} />}
            sx={{
              background: DETAIL_READ_GRADIENT,
              color: "#000",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 999,
              px: 3,
              boxShadow: (th) => `0 8px 24px ${alpha("#7c3aed", th.palette.mode === "dark" ? 0.28 : 0.38)}`,
              "&:active": { transform: "scale(0.97)" },
              "@media (prefers-reduced-motion: reduce)": { "&:active": { transform: "none" } },
            }}
          >
            {t("continueReadingCta")}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};