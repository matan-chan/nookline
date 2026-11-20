import { runScrollPdfTtsHighlightIntoCenter, scrollPdfViewportToOneBasedPage } from "../logic/pdfBookViewerLogic";
import { PDF_TTS_SCROLL_CENTER_BIAS_PX } from "../core/constants";
import { useCallback, useEffect, useRef } from "react";

const TTS_HIGHLIGHT_SCROLL_DELAY_MS = 90;
const USER_SCROLL_PAUSE_MS = 5000;
const PROGRAMMATIC_SCROLL_IGNORE_MS = 700;

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
  const userScrollUntilRef = useRef(0);
  const lastAutoScrollTopRef = useRef<number | null>(null);
  const programmaticScrollUntilRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onUserScroll = () => {
      if (Date.now() < programmaticScrollUntilRef.current) return;
      if (!aiOpen || !ttsPlaying) return;
      const top = el.scrollTop;
      const last = lastAutoScrollTopRef.current;
      if (last != null && Math.abs(top - last) > 24) userScrollUntilRef.current = Date.now() + USER_SCROLL_PAUSE_MS;
    };
    el.addEventListener("scroll", onUserScroll, { passive: true });
    return () => el.removeEventListener("scroll", onUserScroll);
  }, [scrollRef, aiOpen, ttsPlaying]);

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

  const scrollTtsHighlightIntoCenter = useCallback((opts?: { force?: boolean }) => {
    if (!opts?.force && Date.now() < userScrollUntilRef.current) return;
    const el = scrollRef.current;
    const off = scaledOffsetsRef.current;
    if (!el || !off) return;
    programmaticScrollUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_IGNORE_MS;
    runScrollPdfTtsHighlightIntoCenter({
      scrollEl: el,
      scaledOffsets: off,
      numPages,
      ttsHighlightPage,
      ttsReadingPageFallback,
      ttsHighlightItemIndices,
      biasPx: PDF_TTS_SCROLL_CENTER_BIAS_PX,
    });
    window.setTimeout(() => {
      lastAutoScrollTopRef.current = el.scrollTop;
    }, PROGRAMMATIC_SCROLL_IGNORE_MS);
  }, [numPages, ttsHighlightPage, ttsHighlightItemIndices, ttsReadingPageFallback, scrollRef, scaledOffsetsRef]);

  useEffect(() => {
    if (!pdfScrollToReadingRef) return;
    pdfScrollToReadingRef.current = () => scrollTtsHighlightIntoCenter({ force: true });
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
