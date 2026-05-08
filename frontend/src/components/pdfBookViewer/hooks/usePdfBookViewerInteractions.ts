import { documentHasNonCollapsedTextSelection } from "../../../utils/input/documentTextSelection";
import { pdfCaptureHighlightFromSelection } from "../../../utils/pdf/pdfSelectionHighlight";
import { pdfTextPickFromMouseEvent } from "../../../utils/pdf/pdfTextPickFromEvent";
import { useEffect } from "react";
import type { PdfBookViewerProps } from "../core/types";

type Args = {
  scrollRef: React.RefObject<HTMLDivElement>;
  ttsTextLayerTick: number;
  onPdfTextPick: PdfBookViewerProps["onPdfTextPick"];
  onPdfBookmarkContext: PdfBookViewerProps["onPdfBookmarkContext"];
};

export const usePdfBookViewerInteractions = ({ scrollRef, ttsTextLayerTick, onPdfTextPick, onPdfBookmarkContext }: Args) => {
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
  }, [onPdfTextPick, ttsTextLayerTick, scrollRef]);

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
  }, [onPdfBookmarkContext, ttsTextLayerTick, scrollRef]);
};
