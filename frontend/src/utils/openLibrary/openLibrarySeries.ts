import { fetchOpenLibraryJson, openLibraryBooksByIsbnUrl, openLibraryKeyJsonUrl } from "./openLibraryClient";

const parseVolume = (raw: unknown): number | null => {
  if (raw == null) return null;
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  const n = parseFloat(String(raw).replace(/[^\d.]/g, ""));
  return Number.isNaN(n) ? null : n;
};

const seriesFromBooksRow = (row: unknown): { name: string; volume: number | null } | null => {
  if (!row || typeof row !== "object") return null;
  const list = (row as { series?: unknown }).series;
  if (!Array.isArray(list) || list.length === 0) return null;
  const first = list[0] as { name?: string; volume?: unknown };
  const name = typeof first?.name === "string" ? first.name.trim() : "";
  if (!name) return null;
  return { name, volume: parseVolume(first?.volume) };
};

export const resolveOpenLibrarySeriesFromWork = async (
  workKey: string | null
): Promise<{ name: string; volume: number | null } | null> => {
  if (!workKey?.startsWith("/works/")) return null;
  const work = await fetchOpenLibraryJson<{
    series?: { name?: string; series?: { key?: string }; position?: unknown; volume?: unknown }[];
  }>(openLibraryKeyJsonUrl(workKey));
  if (!work) return null;
  if (!work?.series || !Array.isArray(work.series) || work.series.length === 0) return null;
  const first = work.series[0] as { name?: string; series?: { key?: string }; position?: unknown; volume?: unknown };
  let name: string | null = typeof first?.name === "string" && first.name.trim() ? first.name.trim() : null;
  const sk = first?.series?.key;
  if (typeof sk === "string") {
    const sdoc = await fetchOpenLibraryJson<{ name?: string }>(openLibraryKeyJsonUrl(sk));
    if (typeof sdoc?.name === "string" && sdoc.name.trim()) name = sdoc.name.trim();
  }
  if (!name) return null;
  return { name, volume: parseVolume(first?.position ?? first?.volume) };
};

export const resolveOpenLibrarySeriesFromIsbns = async (
  isbns: string[]
): Promise<{ name: string; volume: number | null } | null> => {
  for (const raw of isbns.slice(0, 5)) {
    const isbn = String(raw).replace(/[^0-9Xx]/g, "");
    if (!isbn) continue;
    const data = await fetchOpenLibraryJson<Record<string, unknown>>(openLibraryBooksByIsbnUrl(isbn));
    if (!data || typeof data !== "object") continue;
    const row = (data as Record<string, unknown>)[`ISBN:${isbn}`] ?? Object.values(data)[0];
    const hit = seriesFromBooksRow(row);
    if (hit) return hit;
  }
  return null;
};

export const resolveOpenLibrarySeriesForBook = async (
  workKey: string | null,
  isbns: string[]
): Promise<{ name: string; volume: number | null } | null> => {
  const fromWork = await resolveOpenLibrarySeriesFromWork(workKey);
  if (fromWork) return fromWork;
  if (isbns.length) return resolveOpenLibrarySeriesFromIsbns(isbns);
  return null;
};
