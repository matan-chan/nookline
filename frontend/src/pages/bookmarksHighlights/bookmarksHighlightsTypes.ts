export type UserBookmark = {
  id: number;
  bookId: number;
  bookTitle: string;
  position: string;
  note: string | null;
  createdAt: string;
};

export type UserHighlight = {
  id: number;
  bookId: number;
  bookTitle: string;
  startPos: string;
  endPos: string;
  text: string;
  color: string;
  createdAt: string;
};

export type BookmarksTabKey = "bookmarks" | "highlights";

export const bookmarksRowSx = {
  display: "flex",
  alignItems: "flex-start",
  gap: 2,
  px: { xs: 1.5, sm: 2 },
  py: 1.5,
  borderRadius: 2,
  bgcolor: "background.paper",
} as const;
