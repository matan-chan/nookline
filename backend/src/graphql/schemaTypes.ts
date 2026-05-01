export const graphqlSchemaTypes = `
  type AuthUser {
    id: Int!
    username: String!
    isAdmin: Boolean!
    hasAvatar: Boolean!
  }

  type CustomLibraryBannerRef {
    id: Int!
    url: String!
  }

  type AppCustomization {
    siteName: String!
    hasOverrides: Boolean!
    faviconUrl: String
    customLibraryBanners: [CustomLibraryBannerRef!]!
  }

  type Library {
    id: Int!
    name: String!
    path: String!
    type: String!
    bannerIndex: Int!
    customLibraryBannerId: Int
    createdAt: String!
    series: [Series!]!
    books: [Book!]!
    previewBook: Book
    previewBooks(limit: Int = 3): [Book!]!
  }

  type Series {
    id: Int!
    libraryId: Int!
    title: String!
    description: String
    coverImagePath: String
    metadata: String
    status: String!
    createdAt: String!
    library: Library!
    books: [Book!]!
  }

  type Book {
    id: Int!
    libraryId: Int!
    seriesId: Int
    title: String!
    library: Library!
    series: Series
    filePath: String!
    fileExt: String
    coverImagePath: String
    volumeNumber: Float
    metadata: String
    createdAt: String!
    readingProgressForUser(userId: Int!): ReadingProgress
    isFavoriteForUser(userId: Int!): Boolean!
  }

  type BookWithProgress {
    book: Book!
    progress: ReadingProgress!
  }

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

  type VoiceProfile {
    id: Int!
    userId: Int!
    name: String!
    modelId: String!
    speed: Float!
    pitch: Float!
    isDefault: Boolean!
    createdAt: String!
  }

  type TtsSettings {
    mode: String!
    customBaseUrl: String
    hasCustomApiKey: Boolean!
    voice: String!
    model: String!
    speed: Float!
    pitch: Float!
    chunkMinChars: Int!
    chunkMaxChars: Int!
    chunkPeriodExtra: Int!
    readerShowPage: Boolean!
    readerShowTitle: Boolean!
    readerStripPdfMargins: Boolean!
  }

  type TtsEngineProbe {
    ok: Boolean!
    error: String
  }

  input CreateLibraryInput {
    name: String!
    path: String!
    type: String!
    bannerIndex: Int
    customLibraryBannerId: Int
  }

  input UpdateLibraryInput {
    name: String!
    path: String!
    type: String!
    bannerIndex: Int
    customLibraryBannerId: Int
  }

  input CreateSeriesInput {
    libraryId: Int!
    title: String!
    description: String
    coverImagePath: String
    metadata: String
    status: String
  }

  input CreateBookInput {
    libraryId: Int!
    seriesId: Int
    openLibrarySeriesName: String
    title: String!
    filePath: String!
    coverImagePath: String
    volumeNumber: Float
    metadata: String
  }

  input UpdateReadingProgressInput {
    userId: Int!
    bookId: Int!
    position: String!
    percentage: Float!
  }

  input AddBookmarkInput {
    userId: Int!
    bookId: Int!
    position: String!
    note: String
  }

  input AddHighlightInput {
    userId: Int!
    bookId: Int!
    startPos: String!
    endPos: String!
    text: String!
    color: String
  }

  input SaveVoiceProfileInput {
    userId: Int!
    name: String!
    modelId: String!
    speed: Float
    pitch: Float
    isDefault: Boolean
  }

  input UpdateTtsSettingsInput {
    userId: Int!
    mode: String!
    customBaseUrl: String
    customApiKey: String
    voice: String
    model: String
    speed: Float
    pitch: Float
    chunkMinChars: Int
    chunkMaxChars: Int
    chunkPeriodExtra: Int
    readerShowPage: Boolean
    readerShowTitle: Boolean
    readerStripPdfMargins: Boolean
  }
`;
