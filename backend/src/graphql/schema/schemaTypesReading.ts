export const graphqlSchemaTypesReading = `
  type ReadingProgress {
    id: Int!
    userId: Int!
    bookId: Int!
    position: String!
    percentage: Float!
    updatedAt: String!
  }

  type Bookmark {
    id: Int!
    userId: Int!
    bookId: Int!
    position: String!
    note: String
    createdAt: String!
  }

  type UserBookmark {
    id: Int!
    bookId: Int!
    bookTitle: String!
    position: String!
    note: String
    createdAt: String!
  }

  type UserHighlight {
    id: Int!
    bookId: Int!
    bookTitle: String!
    startPos: String!
    endPos: String!
    text: String!
    color: String!
    createdAt: String!
  }

  type Highlight {
    id: Int!
    userId: Int!
    bookId: Int!
    startPos: String!
    endPos: String!
    text: String!
    color: String!
    createdAt: String!
  }
`;
