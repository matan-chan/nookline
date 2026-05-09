import { gql } from "@apollo/client";

export const DASHBOARD_HOME_QUERY = gql`
  query DashboardHome($userId: Int!) {
    libraries {
      id
      name
      type
      path
      bannerIndex
      customLibraryBannerId
      previewBooks(limit: 3) {
        id
        title
        coverImagePath
        metadata
      }
    }
    favoriteBooks(userId: $userId, limit: 24) {
      id
      title
      coverImagePath
      metadata
      readingProgressForUser(userId: $userId) {
        percentage
      }
    }
    onDeck(userId: $userId) {
      book {
        id
        title
        coverImagePath
        metadata
      }
      progress {
        percentage
      }
    }
    recentlyAdded(limit: 12) {
      id
      title
      coverImagePath
      metadata
      createdAt
      readingProgressForUser(userId: $userId) {
        percentage
      }
    }
  }
`;

export const dashboardHomeRefetch = (userId: number) => ({ query: DASHBOARD_HOME_QUERY, variables: { userId } });

export const DASHBOARD_DELETE_BOOK = gql`
  mutation DeleteBook($id: Int!) {
    deleteBook(id: $id)
  }
`;

export const SYNC_LIBRARY_FROM_DISK = gql`
  mutation SyncLibraryFromDisk($libraryId: Int!) {
    syncLibraryFromDisk(libraryId: $libraryId) {
      id
      title
    }
  }
`;
