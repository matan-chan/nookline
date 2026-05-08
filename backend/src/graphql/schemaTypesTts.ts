export const graphqlSchemaTypesTts = `
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
    readerDarkDocument: Boolean!
  }

  type TtsEngineProbe {
    ok: Boolean!
    error: String
  }
`;
