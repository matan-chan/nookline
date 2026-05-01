import { getStoredToken } from "../auth/authStorage";

type BookWithCover = {
  id: number;
  coverImagePath?: string | null;
  metadata?: string | null;
};

const OPEN_LIBRARY_COVER_RE =
  /^https:\/\/covers\.openlibrary\.org\/b\/id\/(\d+)(?:-[SML])?\.jpg(?:\?.*)?$/i;

export const optimizedCoverSrc = (url: string | null | undefined, bookId?: number): string | null => {
  if (url == null || !String(url).trim()) return null;
  const trimmed = String(url).trim();
  const m = OPEN_LIBRARY_COVER_RE.exec(trimmed);
  if (m) {
    const q = bookId != null && bookId > 0 ? `?bookId=${bookId}` : "";
    return `/api/files/ol-covers/${m[1]}${q}`;
  }
  return trimmed;
};

const parseMetadata = (raw: string | null | undefined) => {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

const hasStoredCoverFile = (b: { coverImagePath?: string | null }) =>
  Boolean(b.coverImagePath && String(b.coverImagePath).trim());

const orderBooksForSeriesCover = <T extends { volumeNumber?: number | null; createdAt: string }>(books: T[]) =>
  [...books].sort((a, b) => {
    const va = a.volumeNumber ?? Number.POSITIVE_INFINITY;
    const vb = b.volumeNumber ?? Number.POSITIVE_INFINITY;
    if (va !== vb) return va - vb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

export const getSeriesCoverUrl = (
  series: { metadata?: string | null },
  books: Array<{
    id: number;
    coverImagePath?: string | null;
    metadata?: string | null;
    volumeNumber?: number | null;
    createdAt: string;
  }>
): string | null => {
  if (!books.length) {
    const sm = parseMetadata(series.metadata);
    return typeof sm?.coverUrl === "string" ? optimizedCoverSrc(sm.coverUrl) : null;
  }
  const ordered = orderBooksForSeriesCover(books);
  for (const b of ordered) {
    if (hasStoredCoverFile(b)) return `/api/files/covers/${b.id}`;
  }
  for (const b of ordered) {
    const meta = parseMetadata(b.metadata);
    if (typeof meta?.coverUrl === "string") return optimizedCoverSrc(meta.coverUrl, b.id);
  }
  const sm = parseMetadata(series.metadata);
  return typeof sm?.coverUrl === "string" ? optimizedCoverSrc(sm.coverUrl) : null;
};

export const getCoverUrl = (book: BookWithCover): string | null => {
  if (hasStoredCoverFile(book)) return `/api/files/covers/${book.id}`;
  const meta = parseMetadata(book.metadata);
  return optimizedCoverSrc(meta?.coverUrl as string | undefined, book.id);
};

export const getFileExt = (book: BookWithCover): "epub" | "pdf" | null => {
  const meta = parseMetadata(book.metadata);
  return meta?.fileExt ?? null;
};

/** Keep in sync with backend `COVER_WIDTH_STEPS` (coverOptimization). */
export const COVER_SRCSET_WIDTHS = [128, 192, 256, 384, 560] as const;

const API_COVER_PATH_RE = /^\/api\/files\/(?:covers\/\d+|ol-covers\/\d+|upload-preview)/;

export const isApiCoverUrl = (href: string): boolean => {
  if (!href.startsWith("/")) return false;
  try {
    const u = new URL(href, "http://localhost");
    return API_COVER_PATH_RE.test(u.pathname);
  } catch {
    return false;
  }
};

export const coverUrlWithWidth = (href: string, w: number): string => {
  const base = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost";
  const u = new URL(href, base);
  u.searchParams.set("w", String(w));
  if (API_COVER_PATH_RE.test(u.pathname)) {
    const tok = typeof window !== "undefined" ? getStoredToken() : null;
    if (tok) u.searchParams.set("token", tok);
  }
  return u.pathname + u.search + u.hash;
};

export const buildCoverSrcSet = (href: string): string | null => {
  if (!isApiCoverUrl(href)) return null;
  return COVER_SRCSET_WIDTHS.map((width) => `${coverUrlWithWidth(href, width)} ${width}w`).join(", ");
};

export const defaultCoverImgSrc = (href: string) => (isApiCoverUrl(href) ? coverUrlWithWidth(href, 384) : href);

export const COVER_SIZES_GRID = "(max-width: 600px) 50vw, (max-width: 900px) 34vw, (max-width: 1400px) 24vw, 200px";
export const COVER_SIZES_HERO = "(max-width: 600px) 75vw, 320px";
export const COVER_SIZES_VOLUME = "152px";
export const COVER_SIZES_RECOMMENDED = "148px";
