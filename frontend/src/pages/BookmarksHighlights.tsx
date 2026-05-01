import { useAuth } from "../auth/AuthContext";
import { pdfHighlightBackgroundRgba } from "../utils/readerHighlightColors";
import { useQuery, useMutation, gql } from "@apollo/client";
import { Box, Button, Tab, Tabs, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useState } from "react";

const BOOKMARKS_PAGE_QUERY = gql`
  query BookmarksPage($userId: Int!) {
    userBookmarks(userId: $userId) {
      id
      bookId
      bookTitle
      position
      note
      createdAt
    }
    userHighlights(userId: $userId) {
      id
      bookId
      bookTitle
      startPos
      endPos
      text
      color
      createdAt
    }
  }
`;

const DELETE_BOOKMARK = gql`
  mutation DeleteBookmark($id: Int!) {
    deleteBookmark(id: $id)
  }
`;

const DELETE_HIGHLIGHT = gql`
  mutation DeleteHighlight($id: Int!) {
    deleteHighlight(id: $id)
  }
`;

type UserBookmark = {
  id: number;
  bookId: number;
  bookTitle: string;
  position: string;
  note: string | null;
  createdAt: string;
};

type UserHighlight = {
  id: number;
  bookId: number;
  bookTitle: string;
  startPos: string;
  endPos: string;
  text: string;
  color: string;
  createdAt: string;
};

type TabKey = "bookmarks" | "highlights";

const rowSx = {
  display: "flex",
  alignItems: "flex-start",
  gap: 2,
  px: { xs: 1.5, sm: 2 },
  py: 1.5,
  borderRadius: 2,
  bgcolor: "background.paper",
} as const;

const BookmarkRow = ({ bookmark, onDelete }: { bookmark: UserBookmark; onDelete: (id: number) => void }) => {
  const { t } = useTranslation("bookmarks");
  const readUrl = `/read/${bookmark.bookId}?bm=${encodeURIComponent(bookmark.position)}`;
  return (
    <Box sx={rowSx}>
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
          {t("positionSnippet", { position: bookmark.position.slice(0, 120) })}
        </Typography>
      </Box>
      <Button size="small" onClick={() => onDelete(bookmark.id)} sx={{ color: "error.main", textTransform: "none", minWidth: 0, flexShrink: 0 }}>
        {t("delete")}
      </Button>
    </Box>
  );
};

const highlightDisplayColor = (raw: string) => {
  const c = raw?.trim() ?? "";
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#ba9eff";
};

const HighlightRow = ({ highlight, onDelete }: { highlight: UserHighlight; onDelete: (id: number) => void }) => {
  const { t } = useTranslation("bookmarks");
  const fill = highlightDisplayColor(highlight.color);
  const readUrl = `/read/${highlight.bookId}?hl=${encodeURIComponent(highlight.startPos)}`;
  return (
    <Box sx={rowSx}>
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

const BookmarksHighlights = () => {
  const { t } = useTranslation("bookmarks");
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("bookmarks");

  const { data, refetch } = useQuery(BOOKMARKS_PAGE_QUERY, {
    variables: { userId: user?.id ?? 0 },
    skip: user == null,
  });

  const [deleteBookmark] = useMutation(DELETE_BOOKMARK, {
    onCompleted: () => refetch(),
  });
  const [deleteHighlight] = useMutation(DELETE_HIGHLIGHT, {
    onCompleted: () => refetch(),
  });

  const bookmarks: UserBookmark[] = data?.userBookmarks ?? [];
  const highlights: UserHighlight[] = data?.userHighlights ?? [];

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, display: "flex", flexDirection: "column", gap: 3, maxWidth: "100%" }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ typography: { xs: "h5", sm: "h4" }, fontWeight: 700 }}>{t("pageTitle")}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t("pageSubtitle")}
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={(th) => ({
          alignSelf: "stretch",
          maxWidth: "100%",
          minHeight: 40,
          bgcolor: th.surfaces.low,
          borderRadius: 2,
          p: 0.5,
          "& .MuiTab-root": { minHeight: 36, textTransform: "capitalize", borderRadius: 1.5 },
          "& .Mui-selected": { bgcolor: "background.paper" },
        })}
      >
        <Tab value="bookmarks" label={t("tabBookmarks", { count: bookmarks.length })} />
        <Tab value="highlights" label={t("tabHighlights", { count: highlights.length })} />
      </Tabs>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {tab === "bookmarks" &&
          (bookmarks.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              {t("emptyBookmarks")}
            </Typography>
          ) : (
            bookmarks.map((b) => <BookmarkRow key={b.id} bookmark={b} onDelete={(id) => deleteBookmark({ variables: { id } })} />)
          ))}

        {tab === "highlights" &&
          (highlights.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              {t("emptyHighlights")}
            </Typography>
          ) : (
            highlights.map((h) => <HighlightRow key={h.id} highlight={h} onDelete={(id) => deleteHighlight({ variables: { id } })} />)
          ))}
      </Box>
    </Box>
  );
};

export default BookmarksHighlights;
