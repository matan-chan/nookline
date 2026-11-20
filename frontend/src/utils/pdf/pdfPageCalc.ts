export const PDF_VIEWPORT_PAD = 20;
export const PDF_PAGE_GAP = 14;
export const PDF_DOCUMENT_PAGES_LIST_NO_PINNED: number[] = [];
/** Extra pages mounted above/below any page that intersects the viewport (not only the anchor page). */
export const PDF_LIST_VIEWPORT_MARGIN_PAGES = 10;
export const PDF_LIST_VIEWPORT_MARGIN_PAGES_LARGE = 16;
export const PDF_MIN_LAYOUT_DIMENSION = 80;
export const PDF_SCROLL_VIEWPORT_ANCHOR_FRACTION = 0.2;
/** Must match vertical padding on the PDF pages list wrapper (see PdfDocumentPagesList). */
export const PDF_DOCUMENT_PAGES_LIST_PAD_TOP_PX = 12;
/** Max width (CSS px) passed to react-pdf `Page`; larger layouts use CSS transform scale so the bitmap stays small. */
export const PDF_PAGE_RASTER_MAX_WIDTH = 2048;
/** Max canvas width×height for the raster (pre-scale); avoids GPU/browser allocation failures. */
export const PDF_CANVAS_MAX_PIXELS = 12_000_000;
/** Cap for `Page` devicePixelRatio; balances sharpness vs memory (canvas scales ~×dpr²). */
export const PDF_MAX_DEVICE_PIXEL_RATIO = 3;

export const resolvePdfRenderDevicePixelRatio = (): number => {
  if (typeof window === "undefined") return 1;
  const raw = window.devicePixelRatio;
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return 1;
  return Math.min(raw, PDF_MAX_DEVICE_PIXEL_RATIO);
};
/** A4 portrait height/width; used when aspect data is missing for a page index. */
export const PDF_DEFAULT_PAGE_ASPECT_RATIO = 297 / 210;

const padAspectsToPageCount = (aspects: number[], pageCount: number): number[] => {
  if (pageCount <= 0) return [];
  const fall =
    aspects.length > 0 ? aspects[aspects.length - 1] : PDF_DEFAULT_PAGE_ASPECT_RATIO;
  const out = aspects.slice(0, pageCount);
  while (out.length < pageCount) out.push(fall);
  return out;
};

export type PdfFitViewportLayout = {
  pageWidths: number[];
  heights: number[];
  offsets: number[];
  total: number;
};

export const pageIndexAtScrollY = (scrollContentY: number, offsets: number[], pageCount: number) => {
  if (pageCount <= 0) return 0;
  if (scrollContentY >= offsets[pageCount]) return pageCount - 1;
  let lo = 0;
  let hi = pageCount - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (offsets[mid] <= scrollContentY) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};

export const pdfScrollAnchorY = (scrollTop: number, clientHeight: number, anchorFraction = PDF_SCROLL_VIEWPORT_ANCHOR_FRACTION) => scrollTop + clientHeight * anchorFraction;

export const pdfEffectiveScrollClientHeight = (clientHeight: number) => Math.max(1, clientHeight);

const parsePlainPageIndex = (position: string | null | undefined): number | null => {
  if (!position) return null;
  const trimmed = position.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = parseInt(trimmed, 10);
  if (Number.isNaN(n) || n < 1) return null;
  return n;
};

export const resolvePdfInitialPage = (numPages: number, storedPage: number | null, savedPosition: string | null, fallbackPct: number): number => {
  if (storedPage != null && storedPage >= 1 && storedPage <= numPages) return storedPage;
  const plain = parsePlainPageIndex(savedPosition);
  if (plain != null && plain >= 1 && plain <= numPages) return plain;
  if (fallbackPct > 0) {
    const est = Math.round((fallbackPct / 100) * numPages);
    return Math.max(1, Math.min(numPages, est));
  }
  return 1;
};

export const parsePdfStoredPage = (position: string | null | undefined): number | null => {
  if (!position) return null;
  const trimmed = position.trim();
  const tagged = /^pdf:(\d+)$/.exec(trimmed);
  if (tagged) {
    const n = parseInt(tagged[1], 10);
    if (!Number.isNaN(n) && n >= 1) return n;
  }
  return null;
};

export const buildPdfFitViewportLayout = (aspects: number[], availW: number, availH: number, pageCount: number): PdfFitViewportLayout => {
  const aw = Math.max(PDF_MIN_LAYOUT_DIMENSION, availW);
  const ah = Math.max(PDF_MIN_LAYOUT_DIMENSION, availH);
  const ext = padAspectsToPageCount(aspects, pageCount).map((a) =>
    Number.isFinite(a) && a > 0 ? a : PDF_DEFAULT_PAGE_ASPECT_RATIO
  );
  const pageWidths = ext.map((a) => Math.min(aw, ah / Math.max(a, 0.0001)));
  const heights = pageWidths.map((w, i) => w * ext[i] + PDF_PAGE_GAP);
  const offsets: number[] = [0];
  for (let i = 0; i < pageCount; i++) offsets.push(offsets[i] + heights[i]);
  return { pageWidths, heights, offsets, total: offsets[pageCount] };
};

export const pdfOneBasedVisiblePageFromScroll = (
  scrollTop: number,
  scrollClientHeight: number,
  offsets: number[],
  pageCount: number,
  listPaddingTopPx = PDF_DOCUMENT_PAGES_LIST_PAD_TOP_PX
) => {
  const anchorY =
    pdfScrollAnchorY(scrollTop, pdfEffectiveScrollClientHeight(scrollClientHeight)) - listPaddingTopPx;
  return pageIndexAtScrollY(anchorY, offsets, pageCount) + 1;
};

export const pdfProgressPercent = (page: number, totalPages: number) => (totalPages > 0 ? Math.round(Math.min(100, Math.max(0, (page / totalPages) * 100))) : 0);

export type PdfListRenderWindow = { start: number; end: number };

export const pdfListRenderWindowFromScroll = (
  scrollTop: number,
  clientHeight: number,
  offsets: number[],
  pageCount: number,
  marginPages: number,
  listPaddingTopPx = PDF_DOCUMENT_PAGES_LIST_PAD_TOP_PX
): PdfListRenderWindow => {
  if (pageCount <= 0) return { start: 1, end: 1 };
  const pad = listPaddingTopPx;
  const y0 = Math.max(0, scrollTop - pad);
  const y1 = Math.max(0, scrollTop + pdfEffectiveScrollClientHeight(clientHeight) - pad);
  const i0 = pageIndexAtScrollY(y0, offsets, pageCount);
  const i1 = pageIndexAtScrollY(y1, offsets, pageCount);
  const lo = Math.min(i0, i1) + 1;
  const hi = Math.max(i0, i1) + 1;
  const m = Math.max(0, marginPages);
  return {
    start: Math.max(1, lo - m),
    end: Math.min(pageCount, hi + m),
  };
};

export const shouldRenderPdfListPage = (pageNum: number, numPages: number, window: PdfListRenderWindow, pinnedSet: ReadonlySet<number>) => {
  if (numPages <= 0) return false;
  if (pageNum >= window.start && pageNum <= window.end) return true;
  if (pinnedSet.has(pageNum)) return true;
  return false;
};

export const measurePdfScrollViewport = (scrollEl: HTMLElement | null, shellEl: HTMLElement | null): { w: number; h: number } => {
  const scrollW = scrollEl?.clientWidth ?? 0;
  const scrollH = scrollEl?.clientHeight ?? 0;
  if (scrollW >= PDF_MIN_LAYOUT_DIMENSION && scrollH >= PDF_MIN_LAYOUT_DIMENSION) return { w: scrollW, h: scrollH };

  const shellW = shellEl?.clientWidth ?? 0;
  const shellH = shellEl?.clientHeight ?? 0;
  if (shellW >= PDF_MIN_LAYOUT_DIMENSION && shellH >= PDF_MIN_LAYOUT_DIMENSION) return { w: shellW, h: shellH };

  const docW = scrollEl?.ownerDocument?.documentElement?.clientWidth ?? 0;
  const winW = typeof window !== "undefined" ? window.innerWidth : 0;
  const winH = typeof window !== "undefined" ? window.innerHeight : 0;
  const w = Math.max(scrollW, shellW, docW, winW, PDF_MIN_LAYOUT_DIMENSION);
  const h = Math.max(scrollH, shellH, winH, PDF_MIN_LAYOUT_DIMENSION);
  return { w, h };
};

export const pdfPageRasterWidthAndScale = (
  desiredCssWidth: number,
  layoutPageWidth: number,
  layoutBodyHeight: number,
  devicePixelRatio = 1
): { rasterWidth: number; cssScale: number } => {
  if (desiredCssWidth <= 0 || layoutPageWidth <= 0) return { rasterWidth: Math.max(1, desiredCssWidth), cssScale: 1 };
  const aspect = layoutBodyHeight / layoutPageWidth;
  const dpr = Math.max(1, Math.min(devicePixelRatio, PDF_MAX_DEVICE_PIXEL_RATIO));
  const maxRwFromArea = Math.sqrt(PDF_CANVAS_MAX_PIXELS / (Math.max(aspect, 1e-12) * dpr * dpr));
  let rw = Math.min(desiredCssWidth, PDF_PAGE_RASTER_MAX_WIDTH, maxRwFromArea);
  if (rw < 1) rw = 1;
  return { rasterWidth: rw, cssScale: desiredCssWidth / rw };
};
