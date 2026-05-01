import { gql } from "@apollo/client";

export const ADD_BOOK_CREATE_BOOK = gql`
  mutation CreateBook($input: CreateBookInput!) {
    createBook(input: $input) { id title }
  }
`;
