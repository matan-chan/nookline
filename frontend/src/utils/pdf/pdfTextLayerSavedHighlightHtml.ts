import type { PdfHighlightStored } from "../reader/readerHighlightPosition";
import { PDF_READER_HIGHLIGHT_MARK_CLASS, pdfSavedHighlightMarkStyleAttr } from "../reader/readerHighlightColors";

const escapeHtmlText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type PdfSavedHighlightRow = { id: number; color: string; stored: PdfHighlightStored };

export const pdfCustomTextWrapSavedHighlights = (
  pageNumber: number,
  itemIndex: number,
  str: string,
  rows: PdfSavedHighlightRow[]
): string | null => {
  if (!str || !rows.length) return null;
  const len = str.length;
  for (const { color, stored } of rows) {
    if (stored.page !== pageNumber) continue;
    const [si, soRaw] = stored.s;
    const [ei, eoRaw] = stored.e;
    if (itemIndex < si || itemIndex > ei) continue;
    const so = Math.max(0, Math.min(soRaw, len));
    const eo = Math.max(0, Math.min(eoRaw, len));
    const open = `<mark class="${PDF_READER_HIGHLIGHT_MARK_CLASS}" ${pdfSavedHighlightMarkStyleAttr(color)}>`;
    const close = `</mark>`;
    if (si === ei && itemIndex === si) {
      if (eo <= so) continue;
      const mid = str.slice(so, eo);
      if (!mid) continue;
      return `${escapeHtmlText(str.slice(0, so))}${open}${escapeHtmlText(mid)}${close}${escapeHtmlText(str.slice(eo))}`;
    }
    if (itemIndex === si && itemIndex < ei) {
      if (so >= len) continue;
      return `${escapeHtmlText(str.slice(0, so))}${open}${escapeHtmlText(str.slice(so))}${close}`;
    }
    if (itemIndex === ei && itemIndex > si) {
      if (eo <= 0) continue;
      return `${open}${escapeHtmlText(str.slice(0, eo))}${close}${escapeHtmlText(str.slice(eo))}`;
    }
    if (itemIndex > si && itemIndex < ei) return `${open}${escapeHtmlText(str)}${close}`;
  }
  return null;
};
