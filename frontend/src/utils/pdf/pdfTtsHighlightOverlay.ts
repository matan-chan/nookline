const PRESENTATION = 'span[role="presentation"]';
const OVERLAY_CLASS = "nookline-tts-pdf-overlay";
const ANCHOR_CLASS = "nookline-tts-reading-pdf-anchor";
const LINE_TOL_PX = 5;
const PAD_PX = 1;

export const TTS_PDF_ANCHOR_CLASS = ANCHOR_CLASS;

type LocalRect = { left: number; top: number; width: number; height: number };

const toLayerLocalRect = (el: HTMLElement, layer: HTMLElement): LocalRect | null => {
  const er = el.getBoundingClientRect();
  const lr = layer.getBoundingClientRect();
  if (er.width <= 0 || er.height <= 0) return null;
  return {
    left: er.left - lr.left,
    top: er.top - lr.top,
    width: er.width,
    height: er.height,
  };
};

const mergeLocalRectsByLine = (rects: LocalRect[]): LocalRect[] => {
  if (!rects.length) return [];
  const sorted = [...rects].sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: LocalRect[] = [];
  let group: LocalRect[] = [];
  let groupTop = sorted[0].top;

  const flush = () => {
    if (!group.length) return;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const r of group) {
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.left + r.width);
      bottom = Math.max(bottom, r.top + r.height);
    }
    lines.push({
      left: left - PAD_PX,
      top: top - PAD_PX,
      width: right - left + PAD_PX * 2,
      height: bottom - top + PAD_PX * 2,
    });
    group = [];
  };

  for (const r of sorted) {
    if (!group.length) {
      group = [r];
      groupTop = r.top;
      continue;
    }
    if (Math.abs(r.top - groupTop) <= LINE_TOL_PX) group.push(r);
    else {
      flush();
      group = [r];
      groupTop = r.top;
    }
  }
  flush();
  return lines;
};

const highlightedPresentationSpans = (layer: HTMLElement) => {
  const anchors = [...layer.querySelectorAll(`mark.${ANCHOR_CLASS}`)];
  const spans = new Set<HTMLElement>();
  for (const a of anchors) {
    const pres = a.closest(PRESENTATION);
    if (pres instanceof HTMLElement) spans.add(pres);
  }
  return [...spans];
};

const clearOverlays = (layer: HTMLElement) => layer.querySelectorAll(`.${OVERLAY_CLASS}`).forEach((n) => n.remove());

export const paintPdfTtsHighlightOverlays = (pageNum: number) => {
  const page = document.querySelector(`[data-page-number="${pageNum}"]`);
  const layer = page?.querySelector(".textLayer");
  if (!(layer instanceof HTMLElement)) return;
  clearOverlays(layer);
  const spans = highlightedPresentationSpans(layer);
  if (!spans.length) return;
  const locals = spans.map((s) => toLayerLocalRect(s, layer)).filter((r): r is LocalRect => r != null);
  const merged = mergeLocalRectsByLine(locals);
  for (const r of merged) {
    const el = document.createElement("div");
    el.className = OVERLAY_CLASS;
    el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, {
      position: "absolute",
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
      pointerEvents: "none",
      zIndex: "0",
    });
    layer.appendChild(el);
  }
};

export const clearPdfTtsHighlightOverlays = (pageNum: number) => {
  const page = document.querySelector(`[data-page-number="${pageNum}"]`);
  const layer = page?.querySelector(".textLayer");
  if (layer instanceof HTMLElement) clearOverlays(layer);
};