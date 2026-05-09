import { useAuth } from "../auth/AuthContext";
import { BOOKMARKS_PAGE_QUERY, DELETE_BOOKMARK, DELETE_HIGHLIGHT } from "./bookmarksHighlights/bookmarksHighlightsQueries";
import type { BookmarksTabKey, UserBookmark, UserHighlight } from "./bookmarksHighlights/bookmarksHighlightsTypes";
import { BookmarkRow } from "./bookmarksHighlights/BookmarkRow";
import { HighlightRow } from "./bookmarksHighlights/HighlightRow";
import { useMutation, useQuery } from "@apollo/client";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useState } from "react";

const BookmarksHighlights = () => {
  const { t } = useTranslation("bookmarks");
  const { user } = useAuth();
  const [tab, setTab] = useState<BookmarksTabKey>("bookmarks");

  const { data, refetch } = useQuery(BOOKMARKS_PAGE_QUERY, {
    variables: { userId: user?.id ?? 0 },
    skip: user == null,
  });

  const [deleteBookmark] = useMutation(DELETE_BOOKMARK, { onCompleted: () => refetch() });
  const [deleteHighlight] = useMutation(DELETE_HIGHLIGHT, { onCompleted: () => refetch() });

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
