import type { DecodedBookmark } from "../../utils/reader/readerBookmarkPosition";
import type { ReaderHighlightNav } from "../../utils/reader/readerHighlightPosition";
import { parsePdfStoredPage } from "../../utils/pdf/pdfPageCalc";
import { isEpubCfi } from "./readerUtils";

export const computeReaderResumeCfi = (
  decodedHl: ReaderHighlightNav | null,
  decodedBm: DecodedBookmark | null,
  savedPosition: string | null,
) => {
  if (decodedHl?.kind === "epub") return decodedHl.cfi;
  if (decodedBm?.kind === "epub") return decodedBm.cfi;
  if (savedPosition && isEpubCfi(savedPosition)) return savedPosition;
  return null;
};

export const computePdfStoredPage = (
  decodedHl: ReaderHighlightNav | null,
  decodedBm: DecodedBookmark | null,
  fileExt: string | null,
  savedPosition: string | null,
) => {
  if (decodedHl?.kind === "pdf") return decodedHl.page;
  if (decodedBm?.kind === "pdf") return decodedBm.page;
  if (fileExt === "pdf") return parsePdfStoredPage(savedPosition);
  return null;
};

export const computePdfBookmarkDomIndex = (
  decodedHl: ReaderHighlightNav | null,
  decodedBm: DecodedBookmark | null,
) => {
  if (decodedHl?.kind === "pdf") return decodedHl.textDomIndex;
  if (decodedBm?.kind === "pdf") return decodedBm.textDomIndex;
  return null;
};
