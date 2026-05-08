import { collectPdfPageAspectRatios, logPdfDocumentLoadError } from "../logic/pdfBookViewerLogic";
import { runPostErrorPdfFileProbe } from "../logic/runPostErrorPdfFileProbe";
import type { PdfListRenderWindow } from "../../../utils/pdf/pdfPageCalc";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useState } from "react";
import type { TFunction } from "i18next";

type Args = {
  bookId: string;
  t: TFunction<"reader">;
  initialScrollDoneRef: React.MutableRefObject<boolean>;
  bookmarkDomScrollDoneRef: React.MutableRefObject<boolean>;
  onPdfDocumentLoad?: (doc: PDFDocumentProxy) => void;
};

export const usePdfDocumentHandlers = ({ bookId, t, initialScrollDoneRef, bookmarkDomScrollDoneRef, onPdfDocumentLoad }: Args) => {
  const [numPages, setNumPages] = useState(0);
  const [aspects, setAspects] = useState<number[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listRenderWindow, setListRenderWindow] = useState<PdfListRenderWindow>({ start: 1, end: 1 });

  const handleDocumentLoad = useCallback(
    async (doc: PDFDocumentProxy) => {
      setLoadError(null);
      setAspects(null);
      setListRenderWindow({ start: 1, end: 1 });
      onPdfDocumentLoad?.(doc);
      setNumPages(doc.numPages);
      initialScrollDoneRef.current = false;
      bookmarkDomScrollDoneRef.current = false;
      setAspects(await collectPdfPageAspectRatios(doc));
    },
    [onPdfDocumentLoad, initialScrollDoneRef, bookmarkDomScrollDoneRef]
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

  return {
    numPages,
    aspects,
    loadError,
    listRenderWindow,
    setListRenderWindow,
    handleDocumentLoad,
    handleDocumentError,
  };
};
