import { bookmarksRowSx, type UserBookmark } from "./bookmarksHighlightsTypes";
import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const POSITION_SNIPPET_MAX = 120;

export const BookmarkRow = ({ bookmark, onDelete }: { bookmark: UserBookmark; onDelete: (id: number) => void }) => {
  const { t } = useTranslation("bookmarks");
  const readUrl = `/read/${bookmark.bookId}?bm=${encodeURIComponent(bookmark.position)}`;
  return (
    <Box sx={bookmarksRowSx}>
      <Box component={Link} to={readUrl} sx={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
          {bookmark.bookTitle} · {new Date(bookmark.createdAt).toLocaleDateString()}
        </Typography>
        {bookmark.note && (
          <Typography variant="body2" sx={{ fontFamily: '"Newsreader", serif', lineHeight: 1.6, fontWeight: 600 }}>
            {bookmark.note}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          {t("positionSnippet", { position: bookmark.position.slice(0, POSITION_SNIPPET_MAX) })}
        </Typography>
      </Box>
      <Button size="small" onClick={() => onDelete(bookmark.id)} sx={{ color: "error.main", textTransform: "none", minWidth: 0, flexShrink: 0 }}>
        {t("delete")}
      </Button>
    </Box>
  );
};
