import { pdfListRenderWindowFromScroll, pdfOneBasedVisiblePageFromScroll, pdfProgressPercent, resolvePdfInitialPage, PDF_LIST_VIEWPORT_MARGIN_PAGES, PDF_LIST_VIEWPORT_MARGIN_PAGES_LARGE } from "../../../utils/pdf/pdfPageCalc";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePdfZoomPinchAndKeys } from "./usePdfZoomPinchAndKeys";
import { usePdfBookViewerInteractions } from "./usePdfBookViewerInteractions";
import { usePdfBookViewerTtsScroll } from "./usePdfBookViewerTtsScroll";
import { usePdfBookmarkScroll } from "./usePdfBookmarkScroll";
import { usePdfDocumentHandlers } from "./usePdfDocumentHandlers";
import { usePdfFileOptions } from "./usePdfFileOptions";
import { PDF_HIGHLIGHT_PIN_PAGE_RADIUS, PDF_SCROLL_PROGRESS_DEBOUNCE_MS } from "../core/constants";
import { derivePdfSavedHighlightsFromRows, derivePdfScaledOffsets, derivePdfViewerLayout, derivePinnedPdfPages } from "../logic/pdfBookViewerLogic";
import type { PdfBookViewerProps } from "../core/types";

const LARGE_PDF_PAGE_THRESHOLD = 800;

export const usePdfBookViewer = ({
  bookId,
  storedPage,
  savedPosition,
  fallbackPercentage,
  onPersistProgress,
  suppressScrollProgressPersist = false,
  aiOpen,
  readerPanelOpen,
  onAiToggle,
  onAiTap,
  onAiLongPress,
  onPdfDocumentLoad,
  onReadingPageChange,
  ttsHighlightPage = null,
  ttsHighlightItemIndices = [],
  ttsTextLayerTick = 0,
  ttsPlaying = false,
  ttsBusy = false,
  ttsAudioRef,
  onPdfTextPick,
  pdfNavigateRef,
  pdfScrollToReadingRef,
  ttsReadingPageFallback = null,
  onPdfBookmarkContext,
  bookmarkScrollDomIndex = null,
  scrollResumeSig = "",
  bookHighlights = [],
}: PdfBookViewerProps) => {
  const { t } = useTranslation("reader");
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scaledOffsetsRef = useRef<number[] | null>(null);
  const initialScrollDoneRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReportedPageRef = useRef(1);
  const bookmarkDomScrollDoneRef = useRef(false);
  const scrollSyncRafRef = useRef<number | null>(null);
  const syncVisiblePageFromScrollRef = useRef<() => void>(() => {});

  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const [visiblePage, setVisiblePage] = useState(1);

  const docHandlers = usePdfDocumentHandlers({ bookId, t, initialScrollDoneRef, bookmarkDomScrollDoneRef, onPdfDocumentLoad });
  const { numPages, aspects, loadError, listRenderWindow, setListRenderWindow, handleDocumentLoad, handleDocumentError } = docHandlers;

  const { file, pdfDocumentOptions } = usePdfFileOptions(bookId);
  const listRenderMargin = useMemo(() => (numPages > LARGE_PDF_PAGE_THRESHOLD ? PDF_LIST_VIEWPORT_MARGIN_PAGES_LARGE : PDF_LIST_VIEWPORT_MARGIN_PAGES), [numPages]);

  const pdfSavedHighlights = useMemo(() => derivePdfSavedHighlightsFromRows(bookHighlights), [bookHighlights]);
  const pinnedPages = useMemo(() => derivePinnedPdfPages(ttsHighlightPage, pdfSavedHighlights, numPages, visiblePage, PDF_HIGHLIGHT_PIN_PAGE_RADIUS), [ttsHighlightPage, pdfSavedHighlights, numPages, visiblePage]);
  const layout = useMemo(() => derivePdfViewerLayout(aspects, numPages, viewport.w, viewport.h), [aspects, numPages, viewport.w, viewport.h]);
  const scaledOffsets = useMemo(() => derivePdfScaledOffsets(layout, numPages, zoom), [layout, numPages, zoom]);
  scaledOffsetsRef.current = scaledOffsets;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewport({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setViewport({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const schedulePersist = useCallback(
    (page: number, total: number) => {
      if (suppressScrollProgressPersist) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        onPersistProgress(`pdf:${page}`, pdfProgressPercent(page, total));
      }, PDF_SCROLL_PROGRESS_DEBOUNCE_MS);
    },
    [onPersistProgress, suppressScrollProgressPersist]
  );

  const syncVisiblePageFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !scaledOffsets || numPages <= 0) return;
    const page = pdfOneBasedVisiblePageFromScroll(el.scrollTop, el.clientHeight, scaledOffsets, numPages);
    setVisiblePage(page);
    setListRenderWindow(pdfListRenderWindowFromScroll(el.scrollTop, el.clientHeight, scaledOffsets, numPages, listRenderMargin));
    if (page !== lastReportedPageRef.current) {
      lastReportedPageRef.current = page;
      onReadingPageChange?.(page, "scroll");
      schedulePersist(page, numPages);
    }
  }, [scaledOffsets, numPages, listRenderMargin, onReadingPageChange, schedulePersist, setListRenderWindow]);

  syncVisiblePageFromScrollRef.current = syncVisiblePageFromScroll;

  useLayoutEffect(() => {
    if (!initialScrollDoneRef.current) return;
    syncVisiblePageFromScroll();
  }, [syncVisiblePageFromScroll]);

  usePdfBookViewerTtsScroll({
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
  });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !scaledOffsets || numPages <= 0 || aspects == null || initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;
    const initial = resolvePdfInitialPage(numPages, storedPage, savedPosition, fallbackPercentage);
    el.scrollTo({ top: scaledOffsets[initial - 1] ?? 0, behavior: "auto" });
    syncVisiblePageFromScroll();
  }, [scaledOffsets, numPages, aspects, storedPage, savedPosition, fallbackPercentage, syncVisiblePageFromScroll]);

  usePdfBookmarkScroll({
    scrollRef,
    bookmarkDomScrollDoneRef,
    lastReportedPageRef,
    bookmarkScrollDomIndex,
    numPages,
    visiblePage,
    layout,
    zoom,
    ttsTextLayerTick,
    scrollResumeSig,
  });

  const onScroll = useCallback(() => {
    if (scrollSyncRafRef.current != null) return;
    scrollSyncRafRef.current = requestAnimationFrame(() => {
      scrollSyncRafRef.current = null;
      syncVisiblePageFromScrollRef.current();
    });
  }, []);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (scrollSyncRafRef.current != null) cancelAnimationFrame(scrollSyncRafRef.current);
    },
    []
  );

  usePdfZoomPinchAndKeys(scrollRef, shellRef, zoomRef, setZoom);
  usePdfBookViewerInteractions({ scrollRef, ttsTextLayerTick, onPdfTextPick, onPdfBookmarkContext });

  return {
    shellRef,
    scrollRef,
    file,
    pdfDocumentOptions,
    numPages,
    layout,
    loadError,
    zoom,
    setZoom,
    visiblePage,
    pinnedPages,
    ttsHighlightPage,
    ttsHighlightItemIndices,
    ttsTextLayerTick,
    pdfSavedHighlights,
    handleDocumentLoad,
    handleDocumentError,
    onScroll,
    backHref: `/book/${bookId}`,
    aiOpen,
    readerPanelOpen,
    onAiToggle,
    onAiTap,
    onAiLongPress,
    ttsPlaying,
    ttsBusy,
    ttsAudioRef,
    listRenderWindow,
  };
};
