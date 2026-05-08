export const graphqlSchemaTypesCore = `
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
    convertPdfToEpub: Boolean!
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
`;
