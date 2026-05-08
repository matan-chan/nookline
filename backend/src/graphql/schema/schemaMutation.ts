export const graphqlSchemaMutation = `
  type Mutation {
    createLibrary(input: CreateLibraryInput!): Library!
    updateLibrary(id: Int!, input: UpdateLibraryInput!): Library!
    deleteLibrary(id: Int!): Boolean!
    syncLibraryFromDisk(libraryId: Int!): [Book!]!

    createSeries(input: CreateSeriesInput!): Series!

    createBook(input: CreateBookInput!): Book!
    setBookFavorite(userId: Int!, bookId: Int!, liked: Boolean!): Book!
    deleteBook(id: Int!): Boolean!

    deleteSeries(id: Int!): Boolean!

    enrichBookFromOpenLibrary(id: Int!): Book!
    enrichSeriesFromOpenLibrary(id: Int!): Series!

    updateReadingProgress(input: UpdateReadingProgressInput!): ReadingProgress!

    addBookmark(input: AddBookmarkInput!): Bookmark!
    deleteBookmark(id: Int!): Boolean!

    addHighlight(input: AddHighlightInput!): Highlight!
    deleteHighlight(id: Int!): Boolean!

    saveVoiceProfile(input: SaveVoiceProfileInput!): VoiceProfile!
    deleteVoiceProfile(id: Int!): Boolean!

    updateTtsSettings(input: UpdateTtsSettingsInput!): TtsSettings!

    updateAppCustomization(siteName: String!): AppCustomization!

    resetAppCustomization: AppCustomization!
  }
`;
