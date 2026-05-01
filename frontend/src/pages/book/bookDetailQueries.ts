import { gql } from "@apollo/client";

export const BOOK_DETAIL_QUERY = gql`
  query BookDetail($id: Int!, $userId: Int!) {
    book(id: $id) {
      id title coverImagePath volumeNumber metadata createdAt
      seriesId
      libraryId
      isFavoriteForUser(userId: $userId)
      library {
        id
        name
      }
      series {
        id
        title
      }
    }
    recommendedBooksForBook(bookId: $id, limit: 10) {
      id
      title
      coverImagePath
      metadata
      createdAt
    }
  }
`;

export const BOOK_DETAIL_SET_FAVORITE = gql`
  mutation BookDetailSetFavorite($userId: Int!, $bookId: Int!, $liked: Boolean!) {
    setBookFavorite(userId: $userId, bookId: $bookId, liked: $liked) {
      id
      isFavoriteForUser(userId: $userId)
    }
  }
`;

export const BOOK_DETAIL_DELETE_BOOK = gql`
  mutation DeleteBook($id: Int!) {
    deleteBook(id: $id)
  }
`;

export const BOOK_DETAIL_ENRICH = gql`
  mutation EnrichBookFromOpenLibrary($id: Int!) {
    enrichBookFromOpenLibrary(id: $id) {
      id
      metadata
    }
  }
`;
