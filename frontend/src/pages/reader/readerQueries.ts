import { gql } from "@apollo/client";

export const READER_BOOK_QUERY = gql`
  query ReaderBook($id: Int!, $userId: Int!) {
    book(id: $id) {
      id
      title
      metadata
      fileExt
      readingProgressForUser(userId: $userId) {
        position
        percentage
      }
    }
  }
`;

export const UPDATE_PROGRESS = gql`
  mutation UpdateProgress($input: UpdateReadingProgressInput!) {
    updateReadingProgress(input: $input) {
      id
      bookId
      position
      percentage
    }
  }
`;

export const READER_TTS_SETTINGS = gql`
  query ReaderTtsSettings($userId: Int!) {
    ttsSettings(userId: $userId) {
      mode
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
    }
  }
`;

export const ADD_BOOKMARK = gql`
  mutation AddBookmark($input: AddBookmarkInput!) {
    addBookmark(input: $input) {
      id
      position
      note
      createdAt
    }
  }
`;

export const READER_HIGHLIGHTS = gql`
  query ReaderHighlights($bookId: Int!) {
    highlights(bookId: $bookId) {
      id
      startPos
      endPos
      text
      color
    }
  }
`;

export const ADD_HIGHLIGHT = gql`
  mutation AddHighlight($input: AddHighlightInput!) {
    addHighlight(input: $input) {
      id
      startPos
      endPos
      text
      color
    }
  }
`;
