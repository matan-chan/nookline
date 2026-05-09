import {
  fetchOpenLibraryJson,
  OL_SEARCH_FIELDS_FULL_META,
  openLibraryCoverLargeUrl,
  openLibrarySearchByQueryUrl,
  openLibrarySearchByTitleUrl,
} from "../../utils/openLibrary/openLibraryClient";
import { resolveOpenLibrarySeriesForBook } from "../../utils/openLibrary/openLibrarySeries";

export type OpenLibraryMeta = {
  title: string;
  author: string | null;
  coverUrl: string | null;
  year: string | null;
  genre: string | null;
  description: string | null;
  workKey: string | null;
  isbns: string[];
  seriesName: string | null;
  seriesVolume: number | null;
};

export type OlDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
  first_sentence?: unknown;
  isbn?: string[];
};

export const titleFromFilename = (filename: string) =>
  filename
    .replace(/\.(epub|pdf)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const authorLikelyMatches = (olAuthors: string[] | undefined, expected: string | null | undefined) => {
  if (!expected?.trim()) return true;
  const hay = (olAuthors ?? []).join(" ").toLowerCase();
  const tokens = expected
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((tok) => tok.length >= 3);
  if (!tokens.length) return true;
  return tokens.some((tok) => hay.includes(tok));
};

export const titleSearchVariants = (raw: string): string[] => {
  const base = raw.trim();
  if (!base) return [];
  const seen = new Set<string>();
  const add = (s: string) => {
    const x = s.trim().replace(/\s+/g, " ");
    if (x) seen.add(x);
  };
  add(base);
  add(base.replace(/;/g, " "));
  add(base.replace(/,/g, " ").replace(/;/g, " "));
  return [...seen];
};

const firstSentenceFromDoc = (doc: OlDoc): string | null => {
  const fs = doc.first_sentence;
  const fromObj =
    typeof fs === "object" && fs !== null && "value" in fs && typeof (fs as { value: unknown }).value === "string"
      ? (fs as { value: string }).value.trim() || null
      : null;
  return fromObj || (typeof fs === "string" ? fs.trim() || null : null);
};

const isbnsFromDoc = (doc: OlDoc): string[] => {
  const raw = doc.isbn;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
};

const docToMeta = (doc: OlDoc, fallbackTitle: string): OpenLibraryMeta => ({
  title: doc.title ?? fallbackTitle,
  author: doc.author_name?.[0] ?? null,
  coverUrl: doc.cover_i != null ? openLibraryCoverLargeUrl(doc.cover_i) : null,
  year: doc.first_publish_year ? String(doc.first_publish_year) : null,
  genre: doc.subject?.[0] ?? null,
  description: firstSentenceFromDoc(doc),
  workKey: typeof doc.key === "string" ? doc.key : null,
  isbns: isbnsFromDoc(doc),
  seriesName: null,
  seriesVolume: null,
});

export const searchOpenLibrary = async (
  title: string,
  author?: string | null,
  requireAuthorIfNoUrlParam?: string | null
): Promise<OpenLibraryMeta | null> => {
  const url = openLibrarySearchByTitleUrl(title, author, 1, OL_SEARCH_FIELDS_FULL_META);
  const data = (await fetchOpenLibraryJson<{ docs?: OlDoc[] }>(url)) ?? { docs: [] };
  const doc = data.docs?.[0] as OlDoc | undefined;
  if (!doc) return null;
  const usedAuthorFilter = Boolean(author?.trim());
  if (!usedAuthorFilter && requireAuthorIfNoUrlParam?.trim())
    if (!authorLikelyMatches(doc.author_name, requireAuthorIfNoUrlParam)) return null;
  return docToMeta(doc, title);
};

export const searchOpenLibraryFuzzy = async (q: string, requireAuthor?: string | null): Promise<OpenLibraryMeta | null> => {
  const query = q.trim();
  if (!query) return null;
  const url = openLibrarySearchByQueryUrl(query, 20, OL_SEARCH_FIELDS_FULL_META);
  const data = (await fetchOpenLibraryJson<{ docs?: OlDoc[] }>(url)) ?? { docs: [] };
  const docs = (data.docs ?? []) as OlDoc[];
  const doc = requireAuthor?.trim()
    ? docs.find((d) => authorLikelyMatches(d.author_name, requireAuthor))
    : docs[0];
  if (!doc) return null;
  return docToMeta(doc, query);
};

export const enrichMetaWithSeries = async (base: OpenLibraryMeta): Promise<OpenLibraryMeta> => {
  const series = await resolveOpenLibrarySeriesForBook(base.workKey, base.isbns);
  return {
    ...base,
    seriesName: series?.name ?? null,
    seriesVolume: series?.volume ?? null,
  };
};
