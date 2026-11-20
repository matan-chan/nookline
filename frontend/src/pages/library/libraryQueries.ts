import { gql } from "@apollo/client";

export const LIBRARY_BROWSER_QUERY = gql`
  query Library($id: Int!, $userId: Int!) {
    library(id: $id) {
      id name type path bannerIndex customLibraryBannerId
      series { id title coverImagePath metadata status createdAt books { id coverImagePath fileExt metadata volumeNumber createdAt } }
      books { id title coverImagePath fileExt metadata seriesId createdAt readingProgressForUser(userId: $userId) { percentage } }
    }
  }
`;

export const LIBRARY_DELETE_BOOK = gql`
  mutation DeleteBook($id: Int!) {
    deleteBook(id: $id)
  }
`;

export const LIBRARY_DELETE_SERIES = gql`
  mutation DeleteSeries($id: Int!) {
    deleteSeries(id: $id)
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
