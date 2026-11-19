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

const isPdfTextLayerTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return !!target.closest(".textLayer");
};

const clearDocumentSelection = () => {
  const sel = document.getSelection();
  if (!sel) return;
  if (!sel.isCollapsed) sel.removeAllRanges();
};

export const usePdfBookViewerInteractions = ({ scrollRef, ttsTextLayerTick, onPdfTextPick, onPdfBookmarkContext }: Args) => {
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onSelectStart = (e: Event) => {
      if (isPdfTextLayerTarget(e.target)) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!isPdfTextLayerTarget(e.target)) return;
      clearDocumentSelection();
    };
    root.addEventListener("selectstart", onSelectStart);
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      root.removeEventListener("selectstart", onSelectStart);
      root.removeEventListener("touchend", onTouchEnd);
    };
  }, [scrollRef, ttsTextLayerTick]);

  useEffect(() => {
    if (!onPdfTextPick) return;
    const root = scrollRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target;
      if (isPdfTextLayerTarget(target)) clearDocumentSelection();
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
