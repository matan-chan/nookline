export const pdfTextPickFromMouseEvent = (
  root: HTMLElement,
  target: EventTarget | null
): { page: number; domIdx: number } | null => {
  if (!(target instanceof Element)) return null;
  const span = target.closest('span[role="presentation"]');
  if (!span || !root.contains(span)) return null;
  const pageEl = span.closest("[data-page-number]");
  if (!pageEl) return null;
  const pn = parseInt(pageEl.getAttribute("data-page-number") || "0", 10);
  if (!pn || Number.isNaN(pn)) return null;
  const layer = span.closest(".textLayer");
  if (!layer) return null;
  const pres = [...layer.querySelectorAll('span[role="presentation"]')];
  const domIdx = pres.indexOf(span as Element);
  if (domIdx < 0) return null;
  return { page: pn, domIdx };
};
