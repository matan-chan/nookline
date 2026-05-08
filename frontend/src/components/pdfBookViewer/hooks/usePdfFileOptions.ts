import { getStoredToken } from "../../../auth/authStorage";
import { buildPdfBookFileUrl } from "../logic/pdfBookViewerLogic";
import { useMemo } from "react";
import type { DocumentProps } from "react-pdf";

export const usePdfFileOptions = (bookId: string) => {
  const file = useMemo(() => buildPdfBookFileUrl(bookId), [bookId]);
  const pdfDocumentOptions = useMemo<DocumentProps["options"]>(() => {
    const tok = getStoredToken();
    if (!tok) return {};
    return { httpHeaders: { Authorization: `Bearer ${tok}` } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);
  return { file, pdfDocumentOptions };
};
