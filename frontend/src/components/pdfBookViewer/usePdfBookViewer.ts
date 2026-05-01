import { pdfListRenderWindowFromScroll, pdfOneBasedVisiblePageFromScroll, pdfProgressPercent, resolvePdfInitialPage, PDF_LIST_VIEWPORT_MARGIN_PAGES, PDF_LIST_VIEWPORT_MARGIN_PAGES_LARGE, type PdfListRenderWindow } from "../../utils/pdfPageCalc";
import { pdfCaptureHighlightFromSelection } from "../../utils/pdfSelectionHighlight";
import { documentHasNonCollapsedTextSelection } from "../../utils/documentTextSelection";
import { pdfTextPickFromMouseEvent } from "../../utils/pdfTextPickFromEvent";
import { getStoredToken } from "../../auth/authStorage";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { DocumentProps } from "react-pdf";
import { usePdfZoomPinchAndKeys } from "./usePdfZoomPinchAndKeys";
import { PDF_HIGHLIGHT_PIN_PAGE_RADIUS, PDF_SCROLL_PROGRESS_DEBOUNCE_MS, PDF_TTS_SCROLL_CENTER_BIAS_PX } from "./constants";
import {
  buildPdfBookFileUrl,
  collectPdfPageAspectRatios,
  derivePdfSavedHighlightsFromRows,
  derivePdfScaledOffsets,
  derivePdfViewerLayout,
  derivePinnedPdfPages,
  logPdfDocumentLoadError,
  runScrollPdfBookmarkDomIndexIntoView,
  runScrollPdfTtsHighlightIntoCenter,
  scrollPdfViewportToOneBasedPage,
} from "./pdfBookViewerLogic";
import { runPostErrorPdfFileProbe } from "./runPostErrorPdfFileProbe";
import type { PdfBookViewerProps } from "./types";

export const usePdfBookViewer = ({
  bookId,
  storedPage,
  savedPosition,
  fallbackPercentage,
  onPersistProgress,
  suppressScrollProgressPersist = false,
  aiOpen,
  onAiToggle,
  onPdfDocumentLoad,
  onReadingPageChange,
  ttsHighlightPage = null,
  ttsHighlightItemIndices = [],
  ttsTextLayerTick = 0,
  ttsPlaying = false,
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

  const [numPages, setNumPages] = useState(0);
  const [aspects, setAspects] = useState<number[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const [visiblePage, setVisiblePage] = useState(1);
  const [listRenderWindow, setListRenderWindow] = useState<PdfListRenderWindow>({ start: 1, end: 1 });

  const file = useMemo(() => buildPdfBookFileUrl(bookId), [bookId]);

  const listRenderMargin = useMemo(() => (numPages > 800 ? PDF_LIST_VIEWPORT_MARGIN_PAGES_LARGE : PDF_LIST_VIEWPORT_MARGIN_PAGES), [numPages]);

  const pdfDocumentOptions = useMemo<DocumentProps["options"]>(() => {
    const t = getStoredToken();
    if (!t) return {};
    return { httpHeaders: { Authorization: `Bearer ${t}` } };
  }, [bookId]);

  const pdfSavedHighlights = useMemo(() => derivePdfSavedHighlightsFromRows(bookHighlights), [bookHighlights]);

  const pinnedPages = useMemo(() => derivePinnedPdfPages(ttsHighlightPage, pdfSavedHighlights, numPages, visiblePage, PDF_HIGHLIGHT_PIN_PAGE_RADIUS), [ttsHighlightPage, pdfSavedHighlights, numPages, visiblePage]);

  const layout = useMemo(() => derivePdfViewerLayout(aspects, numPages, viewport.w, viewport.h), [aspects, numPages, viewport.w, viewport.h]);

  const scaledOffsets = useMemo(() => derivePdfScaledOffsets(layout, numPages, zoom), [layout, numPages, zoom]);

  scaledOffsetsRef.current = scaledOffsets;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewport({ w: el.clientWidth, h: el.clientHeight });
    });
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
  }, [scaledOffsets, numPages, listRenderMargin, onReadingPageChange, schedulePersist]);

  syncVisiblePageFromScrollRef.current = syncVisiblePageFromScroll;

  useLayoutEffect(() => {
    if (!initialScrollDoneRef.current) return;
    syncVisiblePageFromScroll();
  }, [syncVisiblePageFromScroll]);

  const handleDocumentLoad = useCallback(
    async (doc: PDFDocumentProxy) => {
      setLoadError(null);
      setAspects(null);
      setListRenderWindow({ start: 1, end: 1 });
      onPdfDocumentLoad?.(doc);
      const n = doc.numPages;
      setNumPages(n);
      initialScrollDoneRef.current = false;
      bookmarkDomScrollDoneRef.current = false;
      setAspects(await collectPdfPageAspectRatios(doc));
    },
    [onPdfDocumentLoad]
  );

  const handleDocumentError = useCallback(
    (err: Error) => {
      logPdfDocumentLoadError(bookId, err);
      runPostErrorPdfFileProbe(bookId);
      setLoadError(t("loadPdfFailed"));
      setNumPages(0);
      setAspects(null);
      setListRenderWindow({ start: 1, end: 1 });
    },
    [bookId, t]
  );

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
  }, [pdfNavigateRef, numPages]);

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
  }, [numPages, ttsHighlightPage, ttsHighlightItemIndices, ttsReadingPageFallback]);

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
    const timer = window.setTimeout(() => scrollTtsHighlightIntoCenter(), 90);
    return () => window.clearTimeout(timer);
  }, [aiOpen, ttsPlaying, ttsHighlightPage, ttsHighlightItemIndices, ttsTextLayerTick, zoom, scrollTtsHighlightIntoCenter]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !scaledOffsets || numPages <= 0 || aspects == null || initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;
    const initial = resolvePdfInitialPage(numPages, storedPage, savedPosition, fallbackPercentage);
    el.scrollTo({ top: scaledOffsets[initial - 1] ?? 0, behavior: "auto" });
    syncVisiblePageFromScroll();
  }, [scaledOffsets, numPages, aspects, storedPage, savedPosition, fallbackPercentage, syncVisiblePageFromScroll]);

  useEffect(() => {
    bookmarkDomScrollDoneRef.current = false;
  }, [scrollResumeSig]);

  useEffect(() => {
    if (bookmarkScrollDomIndex == null || bookmarkDomScrollDoneRef.current || numPages <= 0) return;
    const root = scrollRef.current;
    if (!root) return;
    const page = lastReportedPageRef.current;
    const timer = window.setTimeout(() => {
      runScrollPdfBookmarkDomIndexIntoView(root, page, bookmarkScrollDomIndex);
      bookmarkDomScrollDoneRef.current = true;
    }, 450);
    return () => window.clearTimeout(timer);
  }, [bookmarkScrollDomIndex, numPages, visiblePage, layout, zoom, ttsTextLayerTick]);

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

  useEffect(() => {
    if (!onPdfTextPick) return;
    const root = scrollRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target;
      const runPick = () => {
        if (documentHasNonCollapsedTextSelection(document)) return;
        const pick = pdfTextPickFromMouseEvent(root, target);
        if (!pick) return;
        onPdfTextPick(pick.page, pick.domIdx);
      };
      requestAnimationFrame(() => requestAnimationFrame(runPick));
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [onPdfTextPick, ttsTextLayerTick]);

  useEffect(() => {
    if (!onPdfBookmarkContext) return;
    const root = scrollRef.current;
    if (!root) return;
    const onCtx = (e: MouseEvent) => {
      const pick = pdfTextPickFromMouseEvent(root, e.target);
      if (!pick) return;
      e.preventDefault();
      const highlight = pdfCaptureHighlightFromSelection(root, pick.page);
      onPdfBookmarkContext({ ...pick, clientX: e.clientX, clientY: e.clientY, highlight });
    };
    root.addEventListener("contextmenu", onCtx);
    return () => root.removeEventListener("contextmenu", onCtx);
  }, [onPdfBookmarkContext, ttsTextLayerTick]);

  const backHref = `/book/${bookId}`;

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
    backHref,
    aiOpen,
    onAiToggle,
    listRenderWindow,
  };
};
