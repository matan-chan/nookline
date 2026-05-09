import { useCallback } from "react";
import type { MutableRefObject } from "react";

type Args = {
  format: "epub" | "pdf";
  paraIndex: number;
  totalParas: number;
  pdfScrollToReadingRef?: MutableRefObject<(() => void) | null>;
  epubHighlightElsRef: MutableRefObject<(HTMLElement | null)[][]>;
};

export const useTtsParagraphPlaybackScroll = ({
  format,
  paraIndex,
  totalParas,
  pdfScrollToReadingRef,
  epubHighlightElsRef,
}: Args) =>
  useCallback(() => {
    if (format === "pdf") {
      pdfScrollToReadingRef?.current?.();
      return;
    }
    if (totalParas <= 0) return;
    const chunkEls = epubHighlightElsRef.current[paraIndex] ?? [];
    const connected = chunkEls.filter((e): e is HTMLElement => Boolean(e?.isConnected));
    const target = connected[0];
    if (!target) return;
    const run = () => {
      try {
        target.scrollIntoView({ block: "center", behavior: "smooth", inline: "nearest" });
      } catch {
        /* ignore */
      }
    };
    run();
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [format, paraIndex, totalParas, pdfScrollToReadingRef, epubHighlightElsRef]);
