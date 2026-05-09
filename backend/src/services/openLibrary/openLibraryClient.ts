import { beLog, beLogErr } from "../../utils/beLog";

const JSON_CACHE_TTL_MS = 5 * 60 * 1000;
const JSON_CACHE_MAX = 300;
const jsonCache = new Map<string, { exp: number; body: unknown }>();

export const OPEN_LIBRARY_ORIGIN = "https://openlibrary.org";
export const OPEN_LIBRARY_COVERS_ORIGIN = "https://covers.openlibrary.org";

export const openLibraryCoverLargeUrl = (coverId: number) =>
  `${OPEN_LIBRARY_COVERS_ORIGIN}/b/id/${coverId}-L.jpg`;

export const openLibraryKeyJsonUrl = (key: string) => `${OPEN_LIBRARY_ORIGIN}${key}.json`;

export const openLibraryWorkRatingsUrl = (workKey: string) => `${OPEN_LIBRARY_ORIGIN}${workKey}/ratings.json`;

export const openLibrarySearchByTitleUrl = (
  title: string,
  author: string | null | undefined,
  limit: number,
  fields: string
) => {
  let url = `${OPEN_LIBRARY_ORIGIN}/search.json?title=${encodeURIComponent(title)}&limit=${limit}&fields=${fields}`;
  if (author?.trim()) url += `&author=${encodeURIComponent(author.trim())}`;
  return url;
};

export const openLibraryBooksByIsbnUrl = (isbn: string) =>
  `${OPEN_LIBRARY_ORIGIN}/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`;

export const OL_SEARCH_FIELDS_WORK_KEY = "key,title";

export const fetchOpenLibraryJson = async (url: string): Promise<any | null> => {
  const now = Date.now();
  const hit = jsonCache.get(url);
  if (hit && hit.exp > now) return hit.body as any;

  beLog("fetchOpenLibraryJson_network", { url: url.slice(0, 160) });
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    try {
      const body = await res.json();
      jsonCacheSet(url, body);
      return body;
    } catch (e) {
      beLogErr("fetchOpenLibraryJson_parse", e, { url: url.slice(0, 120) });
      return null;
    }
  } catch (e) {
    beLogErr("fetchOpenLibraryJson_fetch", e, { url: url.slice(0, 120) });
    return null;
  }
};

export const fetchOpenLibraryCoverResponse = (coverId: number, init?: RequestInit) => {
  beLog("fetchOpenLibraryCoverResponse", { coverId });
  return fetch(openLibraryCoverLargeUrl(coverId), { redirect: "follow", ...init });
};

const jsonCacheSet = (url: string, body: unknown) => {
  if (jsonCache.size >= JSON_CACHE_MAX) {
    const k = jsonCache.keys().next().value;
    if (k !== undefined) jsonCache.delete(k);
  }
  jsonCache.set(url, { exp: Date.now() + JSON_CACHE_TTL_MS, body });
};
