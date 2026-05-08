import { gql } from "@apollo/client";

export const BOOKMARKS_PAGE_QUERY = gql`
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

export const DELETE_BOOKMARK = gql`
  mutation DeleteBookmark($id: Int!) {
    deleteBookmark(id: $id)
  }
`;

export const DELETE_HIGHLIGHT = gql`
  mutation DeleteHighlight($id: Int!) {
    deleteHighlight(id: $id)
  }
`;
