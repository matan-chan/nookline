import { gql } from "@apollo/client";

export const LIBRARY_BROWSER_QUERY = gql`
  query Library($id: Int!, $userId: Int!) {
    library(id: $id) {
      id name type path bannerIndex customLibraryBannerId
      series { id title coverImagePath metadata status books { id coverImagePath metadata volumeNumber createdAt } }
      books { id title coverImagePath metadata seriesId readingProgressForUser(userId: $userId) { percentage } }
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
