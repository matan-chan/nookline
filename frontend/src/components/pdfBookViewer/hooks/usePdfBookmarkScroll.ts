import { runScrollPdfBookmarkDomIndexIntoView } from "../logic/pdfBookViewerLogic";
import { useEffect } from "react";

const BOOKMARK_DOM_SCROLL_DELAY_MS = 450;

type Args = {
  scrollRef: React.RefObject<HTMLDivElement>;
  bookmarkDomScrollDoneRef: React.MutableRefObject<boolean>;
  lastReportedPageRef: React.MutableRefObject<number>;
  bookmarkScrollDomIndex: number | null;
  numPages: number;
  visiblePage: number;
  layout: unknown;
  zoom: number;
  ttsTextLayerTick: number;
  scrollResumeSig: string;
};

export const usePdfBookmarkScroll = ({
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
}: Args) => {
  useEffect(() => {
    bookmarkDomScrollDoneRef.current = false;
  }, [scrollResumeSig, bookmarkDomScrollDoneRef]);

  useEffect(() => {
    if (bookmarkScrollDomIndex == null || bookmarkDomScrollDoneRef.current || numPages <= 0) return;
    const root = scrollRef.current;
    if (!root) return;
    const page = lastReportedPageRef.current;
    const timer = window.setTimeout(() => {
      runScrollPdfBookmarkDomIndexIntoView(root, page, bookmarkScrollDomIndex);
      bookmarkDomScrollDoneRef.current = true;
    }, BOOKMARK_DOM_SCROLL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [bookmarkScrollDomIndex, numPages, visiblePage, layout, zoom, ttsTextLayerTick, scrollRef, bookmarkDomScrollDoneRef, lastReportedPageRef]);
};
