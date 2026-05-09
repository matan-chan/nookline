export const graphqlSchemaQuery = `
  type Query {
    health: String!

    me: AuthUser

    libraries: [Library!]!
    library(id: Int!): Library

    seriesList(libraryId: Int!): [Series!]!
    series(id: Int!): Series

    book(id: Int!): Book
    recommendedBooksForBook(bookId: Int!, limit: Int): [Book!]!
    recentlyAdded(limit: Int): [Book!]!
    favoriteBooks(userId: Int!, limit: Int): [Book!]!
    onDeck(userId: Int!): [BookWithProgress!]!

    bookmarks(bookId: Int!): [Bookmark!]!
    highlights(bookId: Int!): [Highlight!]!
    userBookmarks(userId: Int!): [UserBookmark!]!
    userHighlights(userId: Int!): [UserHighlight!]!

    voiceProfiles(userId: Int!): [VoiceProfile!]!

    ttsSettings(userId: Int!): TtsSettings!
    ttsEngineProbe(userId: Int!): TtsEngineProbe!

    appCustomization: AppCustomization!
  }
`;
