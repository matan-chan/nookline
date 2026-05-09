export const pickVolumeCardSubtitle = (book: { metadata?: string | null; createdAt: string }): string => {
  let meta: Record<string, unknown> = {};
  try {
    meta = book.metadata ? JSON.parse(book.metadata) : {};
  } catch {
    meta = {};
  }
  const yearFromMeta = typeof meta.year === "string" ? meta.year.trim() : "";
  const year = yearFromMeta || String(new Date(book.createdAt).getFullYear());
  const ol = meta.openLibrary as Record<string, unknown> | undefined;
  const subs = ol && Array.isArray(ol.subjects) ? ol.subjects.filter((x): x is string => typeof x === "string") : [];
  const genre = subs[0]?.toUpperCase() || (typeof meta.genre === "string" ? meta.genre.toUpperCase() : "");
  if (genre) return `${year} • ${genre}`;
  return year;
};
