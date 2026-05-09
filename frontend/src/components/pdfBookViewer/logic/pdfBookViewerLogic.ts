import { buildPdfFitViewportLayout, PDF_VIEWPORT_PAD, type PdfFitViewportLayout } from "../../../utils/pdf/pdfPageCalc";
import { decodePdfHighlight, isPdfHighlightStartPos } from "../../../utils/reader/readerHighlightPosition";
import type { PdfSavedHighlightRow } from "../../../utils/pdf/pdfTextLayerSavedHighlightHtml";
import type { PDFDocumentProxy } from "pdfjs-dist";

const PDF_TTS_HIGHLIGHT_CENTER_RETRY_MS = 80;
const PDF_TEXT_PRESENTATION_SELECTOR = 'span[role="presentation"]';
const MIN_PDF_PAGE_DIMENSION_EPS = 1e-6;

export type PdfBookHighlightInput = { id: number; startPos: string; color: string };

export const buildPdfBookFileUrl = (bookId: string) => ({ url: `/api/files/books/${bookId}` });

export const derivePdfSavedHighlightsFromRows = (bookHighlights: PdfBookHighlightInput[] | undefined): PdfSavedHighlightRow[] =>
  (bookHighlights ?? [])
    .filter((h) => isPdfHighlightStartPos(h.startPos))
    .map((h) => {
      const stored = decodePdfHighlight(h.startPos);
      return stored ? { id: h.id, color: h.color, stored } : null;
    })
    .filter((x): x is PdfSavedHighlightRow => x != null);

export const derivePinnedPdfPages = (
  ttsHighlightPage: number | null,
  pdfSavedHighlights: PdfSavedHighlightRow[],
  numPages: number,
  visiblePageOneBased: number,
  highlightPageRadius: number
): number[] => {
  const s = new Set<number>();
  if (ttsHighlightPage != null && ttsHighlightPage >= 1) s.add(ttsHighlightPage);
  if (numPages <= 0) return [...s].sort((a, b) => a - b);
  const v = Math.max(1, Math.min(numPages, visiblePageOneBased));
  for (const h of pdfSavedHighlights) {
    const p = h.stored.page;
    if (p < 1) continue;
    if (numPages > 0 && p > numPages) continue;
    if (Math.abs(p - v) > highlightPageRadius) continue;
    s.add(p);
  }
  return [...s].sort((a, b) => a - b);
};

export const derivePdfViewerLayout = (aspects: number[] | null, numPages: number, viewportW: number, viewportH: number): PdfFitViewportLayout | null => {
  if (!aspects || numPages <= 0 || viewportW <= 0 || viewportH <= 0) return null;
  const pad = PDF_VIEWPORT_PAD * 2;
  const availW = Math.max(0, viewportW - pad);
  const availH = Math.max(0, viewportH - pad);
  return buildPdfFitViewportLayout(aspects, availW, availH, numPages);
};

export const derivePdfScaledOffsets = (layout: PdfFitViewportLayout | null, numPages: number, zoom: number): number[] | null => {
  if (!layout) return null;
  const off: number[] = [0];
  for (let i = 0; i < numPages; i++) off.push(off[i] + layout.heights[i] * zoom);
  return off;
};

export const collectPdfPageAspectRatios = async (doc: PDFDocumentProxy): Promise<number[]> => {
  const n = doc.numPages;
  const next: number[] = [];
  let fallback = 297 / 210;
  for (let i = 1; i <= n; i++) {
    try {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const rw = Math.max(vp.width, MIN_PDF_PAGE_DIMENSION_EPS);
      const ratio = vp.height / rw;
      const clean = Number.isFinite(ratio) && ratio > 0 ? ratio : fallback;
      next.push(clean);
      fallback = clean;
    } catch {
      next.push(fallback);
    }
  }
  return next;
};

export const scrollPdfViewportToOneBasedPage = (
  scrollEl: HTMLElement,
  scaledOffsets: number[],
  numPages: number,
  oneBasedPage: number,
  behavior: ScrollBehavior = "smooth"
) => {
  if (numPages <= 0) return;
  const p = Math.max(1, Math.min(numPages, oneBasedPage)) - 1;
  scrollEl.scrollTo({ top: scaledOffsets[p] ?? 0, behavior });
};

export const logPdfDocumentLoadError = (bookId: string, err: Error) => {
  const url = `/api/files/books/${bookId}`;
  console.error("[PdfBookViewer] document load error", { bookId, url, message: err.message, name: err.name });
};

export const runScrollPdfBookmarkDomIndexIntoView = (root: HTMLElement, oneBasedPage: number, domIndex: number) => {
  const layer = queryPdfPageTextLayer(root, oneBasedPage);
  if (!layer) return;
  const pres = [...layer.querySelectorAll(PDF_TEXT_PRESENTATION_SELECTOR)];
  pres[domIndex]?.scrollIntoView({ block: "center", behavior: "smooth" });
};

export const runScrollPdfTtsHighlightIntoCenter = (params: {
  scrollEl: HTMLElement;
  scaledOffsets: number[];
  numPages: number;
  ttsHighlightPage: number | null;
  ttsReadingPageFallback: number | null;
  ttsHighlightItemIndices: number[];
  biasPx: number;
}) => {
  const { scrollEl: el, scaledOffsets: off, numPages, ttsHighlightPage, ttsReadingPageFallback, ttsHighlightItemIndices: indices, biasPx } = params;
  if (numPages <= 0) return;
  const targetPage = resolveTtsTargetOneBasedPage(ttsHighlightPage, ttsReadingPageFallback, numPages);
  if (targetPage == null) return;
  const pIdx = targetPage - 1;
  const tryCenter = () =>
    tryCenterPdfTtsHighlightSpansInScrollEl({
      scrollEl: el,
      scaledOffsets: off,
      targetPage,
      ttsHighlightItemIndices: indices,
      biasPx,
    });
  if (tryCenter()) return;
  schedulePdfTtsHighlightCenterRetry(el, off[pIdx] ?? 0, tryCenter);
};

const resolveTtsTargetOneBasedPage = (ttsHighlightPage: number | null, ttsReadingPageFallback: number | null, numPages: number): number | null => {
  if (ttsHighlightPage != null && ttsHighlightPage >= 1) return Math.max(1, Math.min(numPages, ttsHighlightPage));
  if (ttsReadingPageFallback != null && ttsReadingPageFallback >= 1) return Math.max(1, Math.min(numPages, ttsReadingPageFallback));
  return null;
};

const schedulePdfTtsHighlightCenterRetry = (scrollEl: HTMLElement, fallbackTop: number, tryCenterAgain: () => boolean) => {
  scrollEl.scrollTo({ top: fallbackTop, behavior: "auto" });
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (!tryCenterAgain()) scrollEl.scrollTo({ top: fallbackTop, behavior: "smooth" });
      }, PDF_TTS_HIGHLIGHT_CENTER_RETRY_MS);
    })
  );
};

const tryCenterPdfTtsHighlightSpansInScrollEl = (params: {
  scrollEl: HTMLElement;
  scaledOffsets: number[];
  targetPage: number;
  ttsHighlightItemIndices: number[];
  biasPx: number;
}): boolean => {
  const { scrollEl: el, scaledOffsets: off, targetPage, ttsHighlightItemIndices: indices, biasPx } = params;
  const pIdx = targetPage - 1;
  if (!indices.length) {
    el.scrollTo({ top: off[pIdx] ?? 0, behavior: "smooth" });
    return true;
  }
  const layer = queryPdfPageTextLayer(el, targetPage);
  if (!layer) return false;
  const spans = collectPresentationSpansAtIndices(layer, indices);
  if (!spans.length) return false;
  const bounds = measureVerticalBoundsOfElements(spans);
  if (bounds == null) return false;
  const nextTop = el.scrollTop + (bounds.midY - el.getBoundingClientRect().top) - el.clientHeight / 2 + biasPx;
  const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
  el.scrollTo({ top: Math.min(maxTop, Math.max(0, nextTop)), behavior: "smooth" });
  return true;
};

const pdfPageTextLayerSelector = (oneBasedPage: number) => `[data-page-number="${oneBasedPage}"] .textLayer`;

const queryPdfPageTextLayer = (root: Element, oneBasedPage: number) => root.querySelector(pdfPageTextLayerSelector(oneBasedPage));

const collectPresentationSpansAtIndices = (layer: Element, indices: number[]) => {
  const pres = [...layer.querySelectorAll(PDF_TEXT_PRESENTATION_SELECTOR)] as HTMLElement[];
  return indices.map((i) => pres[i]).filter((n): n is HTMLElement => Boolean(n));
};

const measureVerticalBoundsOfElements = (elements: HTMLElement[]): { midY: number } | null => {
  if (!elements.length) return null;
  let top = Infinity;
  let bottom = -Infinity;
  for (const s of elements) {
    const r = s.getBoundingClientRect();
    top = Math.min(top, r.top);
    bottom = Math.max(bottom, r.bottom);
  }
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return null;
  return { midY: (top + bottom) / 2 };
};
