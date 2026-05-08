import { pdfHighlightBackgroundRgba } from "../../utils/reader/readerHighlightColors";
import { bookmarksRowSx, type UserHighlight } from "./bookmarksHighlightsTypes";
import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const HIGHLIGHT_DEFAULT_COLOR = "#ba9eff";

const highlightDisplayColor = (raw: string) => {
  const c = raw?.trim() ?? "";
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : HIGHLIGHT_DEFAULT_COLOR;
};

export const HighlightRow = ({ highlight, onDelete }: { highlight: UserHighlight; onDelete: (id: number) => void }) => {
  const { t } = useTranslation("bookmarks");
  const fill = highlightDisplayColor(highlight.color);
  const readUrl = `/read/${highlight.bookId}?hl=${encodeURIComponent(highlight.startPos)}`;
  return (
    <Box sx={bookmarksRowSx}>
      <Box sx={{ width: 4, alignSelf: "stretch", borderRadius: 9999, flexShrink: 0, mt: 0.5, bgcolor: fill }} />
      <Box component={Link} to={readUrl} sx={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
          {highlight.bookTitle}
        </Typography>
        <Typography
          variant="body2"
          sx={(th) => ({
            fontFamily: '"Newsreader", serif',
            fontStyle: "italic",
            lineHeight: 1.6,
            pl: 1,
            py: 0.75,
            pr: 0.75,
            borderRadius: 1,
            borderLeft: `3px solid ${fill}`,
            bgcolor: pdfHighlightBackgroundRgba(fill, th.palette.mode === "dark" ? 0.22 : 0.28),
            color: "text.primary",
          })}
        >
          &ldquo;{highlight.text}&rdquo;
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          {new Date(highlight.createdAt).toLocaleDateString()} · {t("highlightJumpHint")}
        </Typography>
      </Box>
      <Button size="small" onClick={() => onDelete(highlight.id)} sx={{ color: "error.main", textTransform: "none", minWidth: 0, flexShrink: 0 }}>
        {t("delete")}
      </Button>
    </Box>
  );
};
