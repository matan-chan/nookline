import { gql } from "@apollo/client";

export const APP_CUSTOMIZATION = gql`
  query AppCustomization {
    appCustomization {
      siteName
      hasOverrides
      faviconUrl
      customLibraryBanners {
        id
        url
      }
    }
  }
`;

export const UPDATE_APP_CUSTOMIZATION = gql`
  mutation UpdateAppCustomization($siteName: String!) {
    updateAppCustomization(siteName: $siteName) {
      siteName
      hasOverrides
      faviconUrl
      customLibraryBanners {
        id
        url
      }
    }
  }
`;

export const RESET_APP_CUSTOMIZATION = gql`
  mutation ResetAppCustomization {
    resetAppCustomization {
      siteName
      hasOverrides
      faviconUrl
      customLibraryBanners {
        id
        url
      }
    }
  }
`;

export const TTS_SETTINGS_AND_PROBE = gql`
  query TtsSettingsAndProbe($userId: Int!) {
    ttsSettings(userId: $userId) {
      mode
      customBaseUrl
      hasCustomApiKey
      voice
      model
      speed
      pitch
      chunkMinChars
      chunkMaxChars
      chunkPeriodExtra
      readerShowPage
      readerShowTitle
      readerStripPdfMargins
      readerDarkDocument
    }
    ttsEngineProbe(userId: $userId) {
      ok
      error
    }
  }
`;

export const UPDATE_TTS_SETTINGS = gql`
  mutation UpdateTtsSettings($input: UpdateTtsSettingsInput!) {
    updateTtsSettings(input: $input) {
      mode
      customBaseUrl
      hasCustomApiKey
      voice
      model
      speed
      pitch
      chunkMinChars
      chunkMaxChars
      chunkPeriodExtra
      readerShowPage
      readerShowTitle
      readerStripPdfMargins
      readerDarkDocument
    }
  }
`;
