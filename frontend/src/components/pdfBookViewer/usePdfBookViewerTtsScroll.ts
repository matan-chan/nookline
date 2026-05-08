import { runScrollPdfTtsHighlightIntoCenter, scrollPdfViewportToOneBasedPage } from "./pdfBookViewerLogic";
import { PDF_TTS_SCROLL_CENTER_BIAS_PX } from "./constants";
import { useCallback, useEffect } from "react";

const TTS_HIGHLIGHT_SCROLL_DELAY_MS = 90;

type Args = {
  scrollRef: React.RefObject<HTMLDivElement>;
  scaledOffsetsRef: React.MutableRefObject<number[] | null>;
  numPages: number;
  ttsHighlightPage: number | null;
  ttsHighlightItemIndices: number[];
  ttsReadingPageFallback: number | null;
  ttsTextLayerTick: number;
  ttsPlaying: boolean;
  aiOpen: boolean;
  zoom: number;
  pdfNavigateRef?: React.MutableRefObject<((page: number) => void) | null> | null;
  pdfScrollToReadingRef?: React.MutableRefObject<(() => void) | null> | null;
};

export const usePdfBookViewerTtsScroll = ({
  scrollRef,
  scaledOffsetsRef,
  numPages,
  ttsHighlightPage,
  ttsHighlightItemIndices,
  ttsReadingPageFallback,
  ttsTextLayerTick,
  ttsPlaying,
  aiOpen,
  zoom,
  pdfNavigateRef,
  pdfScrollToReadingRef,
}: Args) => {
  useEffect(() => {
    if (!pdfNavigateRef) return;
    pdfNavigateRef.current = (page: number) => {
      const el = scrollRef.current;
      const off = scaledOffsetsRef.current;
      if (!el || !off) return;
      scrollPdfViewportToOneBasedPage(el, off, numPages, page, "smooth");
    };
    return () => {
      pdfNavigateRef.current = null;
    };
  }, [pdfNavigateRef, numPages, scrollRef, scaledOffsetsRef]);

  const scrollTtsHighlightIntoCenter = useCallback(() => {
    const el = scrollRef.current;
    const off = scaledOffsetsRef.current;
    if (!el || !off) return;
    runScrollPdfTtsHighlightIntoCenter({
      scrollEl: el,
      scaledOffsets: off,
      numPages,
      ttsHighlightPage,
      ttsReadingPageFallback,
      ttsHighlightItemIndices,
      biasPx: PDF_TTS_SCROLL_CENTER_BIAS_PX,
    });
  }, [numPages, ttsHighlightPage, ttsHighlightItemIndices, ttsReadingPageFallback, scrollRef, scaledOffsetsRef]);

  useEffect(() => {
    if (!pdfScrollToReadingRef) return;
    pdfScrollToReadingRef.current = scrollTtsHighlightIntoCenter;
    return () => {
      pdfScrollToReadingRef.current = null;
    };
  }, [pdfScrollToReadingRef, scrollTtsHighlightIntoCenter]);

  useEffect(() => {
    if (!aiOpen || !ttsPlaying) return;
    if (ttsHighlightPage == null || ttsHighlightPage < 1) return;
    const timer = window.setTimeout(() => scrollTtsHighlightIntoCenter(), TTS_HIGHLIGHT_SCROLL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [aiOpen, ttsPlaying, ttsHighlightPage, ttsHighlightItemIndices, ttsTextLayerTick, zoom, scrollTtsHighlightIntoCenter]);
};
