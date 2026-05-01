import { epubHighlightSvgBaseStyles } from "../../utils/readerHighlightColors";
import { decodeEpubHighlightCfi, isEpubHighlightStartPos } from "../../utils/readerHighlightPosition";
import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { Theme } from "@mui/material/styles";
import type { Rendition } from "epubjs";

type HighlightRow = { id: number; startPos: string; endPos: string; text: string; color: string };

export const useReaderEpubHighlightAnnotations = ({
  fileExt,
  highlightsSig,
  renditionReadyTick,
  bookId,
  theme,
  bookHighlights,
  renditionRef,
}: {
  fileExt: string | null;
  highlightsSig: string;
  renditionReadyTick: number;
  bookId: string | undefined;
  theme: Theme;
  bookHighlights: HighlightRow[];
  renditionRef: MutableRefObject<Rendition | null>;
}) => {
  const epubHlAppliedRef = useRef<{ cfi: string }[]>([]);

  useEffect(() => {
    if (fileExt !== "epub") return;
    const r = renditionRef.current;
    epubHlAppliedRef.current.forEach(({ cfi }) => {
      try {
        r?.annotations.remove(cfi, "highlight");
      } catch {
        /* ignore */
      }
    });
    epubHlAppliedRef.current = [];
    if (!r) return;
    const rows = bookHighlights.filter((h) => isEpubHighlightStartPos(h.startPos));
    const hlSvgBase = epubHighlightSvgBaseStyles(theme.palette.mode);
    for (const h of rows) {
      const cfi = decodeEpubHighlightCfi(h.startPos);
      if (!cfi) continue;
      try {
        r.annotations.highlight(cfi, { id: h.id }, undefined, `reader-hl-${h.id}`, {
          ...hlSvgBase,
          fill: h.color,
        });
        epubHlAppliedRef.current.push({ cfi });
      } catch {
        /* ignore */
      }
    }
    return () => {
      const rr = renditionRef.current;
      epubHlAppliedRef.current.forEach(({ cfi }) => {
        try {
          rr?.annotations.remove(cfi, "highlight");
        } catch {
          /* ignore */
        }
      });
      epubHlAppliedRef.current = [];
    };
  }, [fileExt, highlightsSig, renditionReadyTick, bookId, theme.palette.mode, bookHighlights]);
};

