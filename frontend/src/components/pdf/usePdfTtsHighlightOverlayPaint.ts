import { clearPdfTtsHighlightOverlays, paintPdfTtsHighlightOverlays } from "../../utils/pdf/pdfTtsHighlightOverlay";
import { useLayoutEffect } from "react";

export const usePdfTtsHighlightOverlayPaint = (
  ttsHighlightPage: number | null,
  ttsHighlightItemIndices: number[],
  ttsTextLayerTick: number,
) => {
  useLayoutEffect(() => {
    if (!ttsHighlightPage || ttsHighlightItemIndices.length === 0) return;
    let rafOuter = 0;
    let rafInner = 0;
    let timer = 0;
    const paint = () => paintPdfTtsHighlightOverlays(ttsHighlightPage);
    rafOuter = requestAnimationFrame(() => {
      paint();
      rafInner = requestAnimationFrame(paint);
      timer = window.setTimeout(paint, 120);
    });
    return () => {
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
      if (timer) window.clearTimeout(timer);
      clearPdfTtsHighlightOverlays(ttsHighlightPage);
    };
  }, [ttsHighlightPage, ttsHighlightItemIndices, ttsTextLayerTick]);
};