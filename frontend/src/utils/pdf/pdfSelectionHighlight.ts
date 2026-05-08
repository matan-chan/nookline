import type { PdfHighlightStored } from "../reader/readerHighlightPosition";

type SpanPoint = { spanIndex: number; textOffset: number };

const textLengthBeforeNodeInSpan = (span: HTMLElement, textNode: Node) => {
  const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
  let len = 0;
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (n === textNode) return len;
    len += n.textContent?.length ?? 0;
  }
  return len;
};

const safeTextOffsetWithinSpan = (span: HTMLElement, node: Node, offset: number) => {
  if (node.nodeType === Node.TEXT_NODE) {
    const base = textLengthBeforeNodeInSpan(span, node);
    return base + offset;
  }
  try {
    const r = document.createRange();
    r.setStart(span, 0);
    r.setEnd(node, offset);
    return r.toString().length;
  } catch {
    return null;
  }
};

const closestPresentationSpan = (node: Node): HTMLElement | null => {
  if (node instanceof HTMLElement) {
    const el = node.closest?.('span[role="presentation"]');
    return el instanceof HTMLElement ? el : null;
  }
  if (!node.parentElement) return null;
  const el = node.parentElement.closest('span[role="presentation"]');
  return el instanceof HTMLElement ? el : null;
};

const spanPointForBoundary = (pres: Element[], node: Node, offset: number, isStart: boolean): SpanPoint | null => {
  const span = closestPresentationSpan(node);
  if (!span) return null;
  const spanIndex = pres.indexOf(span);
  if (spanIndex < 0) return null;

  if (node.nodeType === Node.ELEMENT_NODE && node === span) {
    const len = span.textContent?.length ?? 0;
    return { spanIndex, textOffset: isStart ? 0 : len };
  }

  const to = safeTextOffsetWithinSpan(span, node, offset);
  if (to == null) return null;
  const len = span.textContent?.length ?? 0;
  return { spanIndex, textOffset: Math.max(0, Math.min(to, len)) };
};

const normalizeSpanOrder = (a: SpanPoint, b: SpanPoint) => {
  if (a.spanIndex < b.spanIndex) return { start: a, end: b };
  if (a.spanIndex > b.spanIndex) return { start: b, end: a };
  if (a.textOffset <= b.textOffset) return { start: a, end: b };
  return { start: b, end: a };
};

export const pdfCaptureHighlightFromSelection = (root: HTMLElement, pageNumber: number): PdfHighlightStored | null => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const pageEl = root.querySelector(`[data-page-number="${pageNumber}"]`);
  if (!pageEl || !pageEl.contains(range.commonAncestorContainer)) return null;
  const layer = pageEl.querySelector(".textLayer");
  if (!layer) return null;
  const pres = [...layer.querySelectorAll('span[role="presentation"]')];
  if (!pres.length) return null;

  const rawStart = spanPointForBoundary(pres, range.startContainer, range.startOffset, true);
  const rawEnd = spanPointForBoundary(pres, range.endContainer, range.endOffset, false);
  if (!rawStart || !rawEnd) return null;
  const { start, end } = normalizeSpanOrder(rawStart, rawEnd);
  const text = range.toString().replace(/\s+/g, " ").trim();
  if (!text) return null;
  return {
    page: pageNumber,
    s: [start.spanIndex, start.textOffset],
    e: [end.spanIndex, end.textOffset],
    t: text.slice(0, 8000),
  };
};
