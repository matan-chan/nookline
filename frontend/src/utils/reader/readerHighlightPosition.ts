const EPUB_HL_PREFIX = "epubhl1:";
const PDF_HL_PREFIX = "pdfhl1:";

export const encodeEpubHighlightPositions = (cfiRange: string) => {
  const s = `${EPUB_HL_PREFIX}${encodeURIComponent(cfiRange)}`;
  return { startPos: s, endPos: s };
};

export const decodeEpubHighlightCfi = (startPos: string): string | null => {
  if (!startPos.startsWith(EPUB_HL_PREFIX)) return null;
  try {
    const inner = decodeURIComponent(startPos.slice(EPUB_HL_PREFIX.length));
    return inner.startsWith("epubcfi(") ? inner : null;
  } catch {
    return null;
  }
};

export type PdfHighlightStored = {
  page: number;
  s: [number, number];
  e: [number, number];
  t: string;
};

export const encodePdfHighlightPositions = (p: PdfHighlightStored) => {
  const s = `${PDF_HL_PREFIX}${encodeURIComponent(JSON.stringify(p))}`;
  return { startPos: s, endPos: s };
};

export const decodePdfHighlight = (startPos: string): PdfHighlightStored | null => {
  if (!startPos.startsWith(PDF_HL_PREFIX)) return null;
  try {
    const j = JSON.parse(decodeURIComponent(startPos.slice(PDF_HL_PREFIX.length))) as Partial<PdfHighlightStored>;
    if (
      typeof j.page !== "number" ||
      !Array.isArray(j.s) ||
      !Array.isArray(j.e) ||
      typeof j.t !== "string" ||
      j.s.length !== 2 ||
      j.e.length !== 2
    )
      return null;
    return { page: j.page, s: [j.s[0], j.s[1]], e: [j.e[0], j.e[1]], t: j.t };
  } catch {
    return null;
  }
};

export const isEpubHighlightStartPos = (startPos: string) => startPos.startsWith(EPUB_HL_PREFIX);

export const isPdfHighlightStartPos = (startPos: string) => startPos.startsWith(PDF_HL_PREFIX);

export type ReaderHighlightNav =
  | { kind: "pdf"; page: number; textDomIndex: number }
  | { kind: "epub"; cfi: string };

export const highlightNavFromStartPos = (startPos: string): ReaderHighlightNav | null => {
  const pdf = decodePdfHighlight(startPos);
  if (pdf) return { kind: "pdf", page: pdf.page, textDomIndex: Math.max(0, Math.floor(pdf.s[0])) };
  const cfi = decodeEpubHighlightCfi(startPos);
  if (cfi) return { kind: "epub", cfi };
  return null;
};
