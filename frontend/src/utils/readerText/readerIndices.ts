import type { SpanSeg } from "./ttsChunking";

export const pdfItemIndexToParagraphIndex = (paraItemIndices: number[][], itemIndex: number): number => {
  const i = paraItemIndices.findIndex((indices) => indices.includes(itemIndex));
  return i >= 0 ? i : 0;
};

const pdfTextItemPresentationSlots = (item: { str: string; hasEOL?: boolean }) => (item.str && item.hasEOL ? 2 : 1);

/** Maps `[role="presentation"]` index within a page text layer to pdf.js `itemIndex` (matches react-pdf TextLayer indexing). */
export const mapPresentationDomIndexToItemIndex = (items: readonly unknown[], textPresentationIndex: number): number => {
  let pres = 0;
  let lastTextIdx = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== "object" || !("str" in item)) continue;
    lastTextIdx = i;
    const ti = item as { str: string; hasEOL?: boolean };
    const slots = pdfTextItemPresentationSlots(ti);
    if (textPresentationIndex >= pres && textPresentationIndex < pres + slots) return i;
    pres += slots;
  }
  return lastTextIdx;
};

export const charOffsetForPdfItemIndex = (spans: SpanSeg<number[]>[], itemIndex: number) => {
  for (const sp of spans) if (sp.meta.includes(itemIndex)) return sp.start;
  return 0;
};

const findChunkIndexForElement = (chunkHighlightEls: (HTMLElement | null)[][], el: Element): number | null => {
  for (let i = 0; i < chunkHighlightEls.length; i++) for (const h of chunkHighlightEls[i]) if (h && (h === el || h.contains(el))) return i;
  return null;
};

export const epubParagraphIndexForDomTarget = (chunkHighlightEls: (HTMLElement | null)[][], target: Node): number | null => {
  let walk: Node | null = target;
  while (walk && walk.nodeType !== Node.DOCUMENT_NODE) {
    if (walk.nodeType === Node.ELEMENT_NODE) {
      const hit = findChunkIndexForElement(chunkHighlightEls, walk as Element);
      if (hit != null) return hit;
    }
    walk = walk.parentNode;
  }
  return null;
};
