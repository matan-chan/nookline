import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Rendition } from "epubjs";

type FlushArgs = {
  persist: ((position: string, percentage: number) => void) | undefined;
  format: "epub" | "pdf";
  pdfDoc: PDFDocumentProxy | null;
  /** Last page from scroll / UI (fallback when no TTS session). */
  pdfPage: number;
  /** Page of the active PDF TTS session, when set. */
  pdfSessionPage: number | null;
  rendition: Rendition | null;
  opts?: { pdfPage?: number };
};

export const flushServerReadingPosition = ({ persist, format, pdfDoc, pdfPage, pdfSessionPage, rendition, opts }: FlushArgs) => {
  if (!persist) return;
  if (format === "pdf") {
    const fromSession = pdfSessionPage != null && pdfSessionPage >= 1 ? pdfSessionPage : null;
    const p = opts?.pdfPage ?? fromSession ?? pdfPage;
    const tot = pdfDoc?.numPages ?? 1;
    const pct = tot > 0 ? Math.round(Math.min(100, Math.max(0, (p / tot) * 100))) : 0;
    persist(`pdf:${p}`, pct);
    return;
  }
  if (!rendition) return;
  void Promise.resolve(rendition.currentLocation()).then((raw) => {
    const loc = raw as { start?: { cfi?: string; percentage?: number } } | null;
    const start = loc?.start;
    const cfi = start?.cfi;
    if (!cfi || !cfi.startsWith("epubcfi(")) return;
    let pct = 0;
    if (typeof start?.percentage === "number" && !Number.isNaN(start.percentage))
      pct = Math.round(Math.min(100, Math.max(0, start.percentage * 100)));
    persist(cfi, pct);
  });
};
