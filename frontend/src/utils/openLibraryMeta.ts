export const OPEN_LIBRARY_META_VERSION = 3;

export const isOpenLibraryEnrichmentCurrent = (openLibrary: unknown): boolean => {
  if (!openLibrary || typeof openLibrary !== "object") return false;
  const o = openLibrary as { enrichedAt?: string; fetchFailed?: boolean; sourceVersion?: number };
  if (typeof o.enrichedAt === "string" && o.fetchFailed) return true; // attempted; skip auto-enrich (BookDetail/SeriesView useEffect)
  if (typeof o.enrichedAt !== "string") return false;
  return o.sourceVersion === OPEN_LIBRARY_META_VERSION;
};
