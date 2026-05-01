import type { PDFDocumentProxy } from "pdfjs-dist";
import type { MutableRefObject } from "react";
import type { PdfHighlightStored } from "../../utils/readerHighlightPosition";

export type PdfBookViewerProps = {
  bookId: string;
  storedPage: number | null;
  savedPosition: string | null;
  fallbackPercentage: number;
  onPersistProgress: (position: string, percentage: number) => void;
  suppressScrollProgressPersist?: boolean;
  aiOpen: boolean;
  onAiToggle: () => void;
  onPdfDocumentLoad?: (doc: PDFDocumentProxy) => void;
  onReadingPageChange?: (page: number, source?: "scroll" | "tts" | "button") => void;
  ttsHighlightPage?: number | null;
  ttsHighlightItemIndices?: number[];
  ttsTextLayerTick?: number;
  ttsPlaying?: boolean;
  pdfNavigateRef?: MutableRefObject<((page: number) => void) | null>;
  pdfScrollToReadingRef?: MutableRefObject<(() => void) | null>;
  ttsReadingPageFallback?: number | null;
  onPdfTextPick?: (page: number, textPresentationIndex: number) => void;
  onPdfBookmarkContext?: (ctx: { page: number; domIdx: number; clientX: number; clientY: number; highlight: PdfHighlightStored | null }) => void;
  bookmarkScrollDomIndex?: number | null;
  scrollResumeSig?: string;
  bookHighlights?: { id: number; startPos: string; color: string }[];
};
