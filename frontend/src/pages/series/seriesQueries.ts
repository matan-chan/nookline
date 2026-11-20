import { gql } from "@apollo/client";

export const SERIES_VIEW_QUERY = gql`
  query Series($id: Int!, $userId: Int!) {
    series(id: $id) {
      id libraryId title description coverImagePath metadata
      library {
        id
        name
      }
      books { id title volumeNumber coverImagePath fileExt metadata createdAt readingProgressForUser(userId: $userId) { percentage } }
    }
  }
`;

export const SERIES_DELETE_SERIES = gql`
  mutation DeleteSeries($id: Int!) {
    deleteSeries(id: $id)
  }
`;

export const SERIES_DELETE_BOOK = gql`
  mutation DeleteBook($id: Int!) {
    deleteBook(id: $id)
  }
`;

export const SERIES_ENRICH = gql`
  mutation EnrichSeriesFromOpenLibrary($id: Int!) {
    enrichSeriesFromOpenLibrary(id: $id) {
      id
      metadata
      description
    }
  }
`;
