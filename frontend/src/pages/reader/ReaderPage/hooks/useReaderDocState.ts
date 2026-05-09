import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Rendition } from "epubjs";
import { useCallback, useEffect, useRef, useState } from "react";

export const useReaderDocState = (bookId: string | undefined) => {
  const [navRevision, setNavRevision] = useState(0);
  const [pdfPanelPage, setPdfPanelPage] = useState(1);
  const [pdfPanelNumPages, setPdfPanelNumPages] = useState(0);
  const [renditionReadyTick, setRenditionReadyTick] = useState(0);

  const renditionRef = useRef<Rendition | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const pdfPageRef = useRef(1);
  const pdfNavigateRef = useRef<((page: number) => void) | null>(null);
  const pdfScrollToReadingRef = useRef<(() => void) | null>(null);
  const epubTtsNavSuppressRef = useRef(false);

  const bumpNav = useCallback(() => setNavRevision((n) => n + 1), []);

  const onPdfDocumentLoad = useCallback((doc: PDFDocumentProxy) => {
    pdfDocRef.current = doc;
    setPdfPanelNumPages(doc.numPages);
  }, []);

  const onReadingPageChange = useCallback(
    (page: number, source?: "scroll" | "tts" | "button") => {
      pdfPageRef.current = page;
      setPdfPanelPage(page);
      if (source === "button") bumpNav();
    },
    [bumpNav]
  );

  const onRenditionReady = useCallback((r: Rendition) => {
    renditionRef.current = r;
    setRenditionReadyTick((n) => n + 1);
  }, []);

  useEffect(() => {
    setNavRevision(0);
    renditionRef.current = null;
    pdfDocRef.current = null;
    pdfPageRef.current = 1;
    setPdfPanelPage(1);
    setPdfPanelNumPages(0);
  }, [bookId]);

  return {
    navRevision,
    pdfPanelPage,
    pdfPanelNumPages,
    renditionReadyTick,
    renditionRef,
    pdfDocRef,
    pdfPageRef,
    pdfNavigateRef,
    pdfScrollToReadingRef,
    epubTtsNavSuppressRef,
    bumpNav,
    onPdfDocumentLoad,
    onReadingPageChange,
    onRenditionReady,
  };
};
