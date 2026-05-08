export const graphqlSchemaTypesInputs = `
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
    readerDarkDocument: Boolean
  }
`;
