import { beLogErr } from "../../utils/beLog";

export const OL_META_VERSION = 3;

export const parseMeta = (raw: string | null | undefined): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? (o as Record<string, unknown>) : null;
  } catch (e) {
    beLogErr("parseMeta_openLibraryEnrichment", e);
    return null;
  }
};

export const isAlreadyEnriched = (meta: Record<string, unknown> | null) => {
  const ol = meta?.openLibrary;
  if (!ol || typeof ol !== "object") return false;
  if ((ol as { fetchFailed?: boolean }).fetchFailed) return false;
  if (typeof (ol as { enrichedAt?: string }).enrichedAt !== "string") return false;
  return (ol as { sourceVersion?: number }).sourceVersion === OL_META_VERSION;
};

export const normalizeDescription = (raw: unknown): string | null => {
  if (raw == null) return null;
  if (typeof raw === "string") return raw.trim() || null;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const d = normalizeDescription(item);
      if (d) return d;
    }
    return null;
  }
  if (typeof raw === "object" && raw !== null && "value" in raw) return normalizeDescription((raw as { value?: unknown }).value);
  return null;
};

export const firstExcerptFromWork = (work: { excerpts?: unknown }): string | null => {
  const list = work.excerpts;
  if (!Array.isArray(list) || list.length === 0) return null;
  const ex = (list[0] as { excerpt?: unknown })?.excerpt;
  return typeof ex === "string" ? ex.trim() || null : null;
};

export const normalizeSubjects = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") out.push(item);
    else if (item && typeof item === "object" && "name" in item && typeof (item as { name?: unknown }).name === "string")
      out.push((item as { name: string }).name);
    if (out.length >= 40) break;
  }
  return out;
};

export const parseRatingsSummary = (data: unknown) => {
  const s = (data as { summary?: unknown } | null)?.summary;
  if (!s || typeof s !== "object") return { average: null as number | null, count: null as number | null };
  const o = s as { average?: unknown; count?: unknown };
  const average = typeof o.average === "number" ? o.average : null;
  const count = typeof o.count === "number" ? o.count : null;
  return { average, count };
};
