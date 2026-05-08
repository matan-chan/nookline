import { extractEpubParagraphs, extractPdfParagraphs } from "../../utils/readerText";
import type { PlayArgs } from "./ttsParagraphPlayArgs";
import { useCallback } from "react";

type LoaderArgs = Pick<PlayArgs, "format" | "renditionRef" | "pdfDocRef" | "pdfPageRef" | "chunkLimitsRef" | "pdfMarginStripOptsRef">;

export const useTtsParagraphLoader = ({
  format,
  renditionRef,
  pdfDocRef,
  pdfPageRef,
  chunkLimitsRef,
  pdfMarginStripOptsRef,
}: LoaderArgs) =>
  useCallback(async () => {
    const lim = chunkLimitsRef.current;
    if (format === "epub") {
      const r = renditionRef.current;
      if (!r) return null;
      return extractEpubParagraphs(r, lim);
    }
    const doc = pdfDocRef.current;
    const page = pdfPageRef.current || 1;
    if (!doc) return null;
    const { enabled, regexes } = pdfMarginStripOptsRef.current;
    const pdfOpts = enabled && regexes.length > 0 ? { marginLineRegexes: regexes } : undefined;
    return extractPdfParagraphs(doc, page, lim, pdfOpts);
  }, [format, renditionRef, pdfDocRef, pdfPageRef, chunkLimitsRef, pdfMarginStripOptsRef]);
