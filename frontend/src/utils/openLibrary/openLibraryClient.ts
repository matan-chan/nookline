const JSON_CACHE_TTL_MS = 5 * 60 * 1000;
const JSON_CACHE_MAX = 200;
const jsonCache = new Map<string, { exp: number; body: unknown }>();

const jsonCacheSet = (url: string, body: unknown) => {
  if (jsonCache.size >= JSON_CACHE_MAX) {
    const k = jsonCache.keys().next().value;
    if (k !== undefined) jsonCache.delete(k);
  }
  jsonCache.set(url, { exp: Date.now() + JSON_CACHE_TTL_MS, body });
};

export const OPEN_LIBRARY_ORIGIN = "https://openlibrary.org";
export const OPEN_LIBRARY_COVERS_ORIGIN = "https://covers.openlibrary.org";

export const openLibraryCoverLargeUrl = (coverId: number) => `${OPEN_LIBRARY_COVERS_ORIGIN}/b/id/${coverId}-L.jpg`;

export const openLibraryKeyJsonUrl = (key: string) => `${OPEN_LIBRARY_ORIGIN}${key}.json`;

export const openLibraryBooksByIsbnUrl = (isbn: string) => `${OPEN_LIBRARY_ORIGIN}/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`;

export const OL_SEARCH_FIELDS_FULL_META = "key,title,author_name,cover_i,first_publish_year,subject,first_sentence,isbn";

export const openLibrarySearchByTitleUrl = (title: string, author: string | null | undefined, limit: number, fields: string) => {
  let url = `${OPEN_LIBRARY_ORIGIN}/search.json?title=${encodeURIComponent(title)}&limit=${limit}&fields=${fields}`;
  if (author?.trim()) url += `&author=${encodeURIComponent(author.trim())}`;
  return url;
};

export const openLibrarySearchByQueryUrl = (q: string, limit: number, fields: string) => `${OPEN_LIBRARY_ORIGIN}/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=${fields}`;

export const fetchOpenLibraryJson = async <T = unknown>(url: string): Promise<T | null> => {
  const now = Date.now();
  const hit = jsonCache.get(url);
  if (hit && hit.exp > now) return hit.body as T;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = (await res.json()) as T;
    jsonCacheSet(url, body);
    return body;
  } catch {
    return null;
  }
};
