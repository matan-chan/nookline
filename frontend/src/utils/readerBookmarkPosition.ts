import { parsePdfStoredPage } from "./pdfPageCalc";

export type DecodedBookmark =
  | { kind: "pdf"; page: number; textDomIndex: number }
  | { kind: "epub"; cfi: string; paraIndex: number };

const EPUB_PREFIX = "epub+json:";

export const encodePdfBookmarkPosition = (page: number, textDomIndex: number) => `pdf:${page}:${textDomIndex}`;

export const encodeEpubBookmarkPosition = (cfi: string, paraIndex: number) =>
  `${EPUB_PREFIX}${encodeURIComponent(JSON.stringify({ c: cfi, p: paraIndex }))}`;

export const decodeReaderBookmark = (raw: string | null | undefined): DecodedBookmark | null => {
  if (!raw) return null;
  const t = raw.trim();
  if (t.startsWith(EPUB_PREFIX)) {
    try {
      const j = JSON.parse(decodeURIComponent(t.slice(EPUB_PREFIX.length))) as { c?: unknown; p?: unknown };
      const cfi = typeof j.c === "string" ? j.c : "";
      const p = typeof j.p === "number" && !Number.isNaN(j.p) ? Math.max(0, Math.floor(j.p)) : 0;
      if (!cfi.startsWith("epubcfi(")) return null;
      return { kind: "epub", cfi, paraIndex: p };
    } catch {
      return null;
    }
  }
  const m = /^pdf:(\d+):(\d+)$/.exec(t);
  if (m) {
    const page = parseInt(m[1], 10);
    const dom = parseInt(m[2], 10);
    if (page >= 1 && dom >= 0) return { kind: "pdf", page, textDomIndex: dom };
  }
  const pageOnly = parsePdfStoredPage(t);
  if (pageOnly != null) return { kind: "pdf", page: pageOnly, textDomIndex: 0 };
  if (t.startsWith("epubcfi(")) return { kind: "epub", cfi: t, paraIndex: 0 };
  return null;
};
