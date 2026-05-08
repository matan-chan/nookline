import { clampPdfZoom, PDF_ZOOM_STEP } from "../../PdfZoomToolbar";
import { useEffect } from "react";
import type { MutableRefObject, RefObject } from "react";

export const usePdfZoomPinchAndKeys = (
  scrollRef: RefObject<HTMLDivElement | null>,
  shellRef: RefObject<HTMLDivElement | null>,
  zoomRef: MutableRefObject<number>,
  setZoom: (v: number | ((z: number) => number)) => void,
) => {
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const touchDist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    let pinch: { d0: number; z0: number } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2)
        pinch = { d0: touchDist(e.touches[0], e.touches[1]), z0: zoomRef.current };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinch) return;
      e.preventDefault();
      const d = touchDist(e.touches[0], e.touches[1]);
      if (pinch.d0 < 1e-6) return;
      setZoom(clampPdfZoom(pinch.z0 * (d / pinch.d0)));
    };

    const endPinch = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", endPinch);
    el.addEventListener("touchcancel", endPinch);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", endPinch);
      el.removeEventListener("touchcancel", endPinch);
    };
  }, [scrollRef, zoomRef, setZoom]);

  useEffect(() => {
    const shellEl = shellRef.current;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? PDF_ZOOM_STEP : -PDF_ZOOM_STEP;
      setZoom((z) => clampPdfZoom(z + delta));
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const node = e.target;
      if (node instanceof HTMLElement && node.closest("input, textarea, [contenteditable=true]")) return;
      const zoomIn = e.key === "+" || e.key === "=" || e.code === "NumpadAdd";
      const zoomOut = e.key === "-" || e.code === "NumpadSubtract";
      if (zoomIn) {
        e.preventDefault();
        setZoom((z) => clampPdfZoom(z + PDF_ZOOM_STEP));
        return;
      }
      if (zoomOut) {
        e.preventDefault();
        setZoom((z) => clampPdfZoom(z - PDF_ZOOM_STEP));
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    };
    shellEl?.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      shellEl?.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [shellRef, setZoom]);
};
