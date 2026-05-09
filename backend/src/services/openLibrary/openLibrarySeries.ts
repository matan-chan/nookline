import type { PrismaClient } from "@prisma/client";
import { fetchOpenLibraryJson, openLibraryBooksByIsbnUrl, openLibraryKeyJsonUrl } from "./openLibraryClient";
import { beLog } from "../../utils/beLog";

export const findOrCreateSeriesByTitle = async (db: PrismaClient, libraryId: number, title: string) => {
  beLog("findOrCreateSeriesByTitle", { libraryId });
  const t = title.trim();
  const existing = await db.series.findFirst({ where: { libraryId, title: t } });
  if (existing) return existing;
  return db.series.create({
    data: {
      libraryId,
      title: t,
      status: "ONGOING",
      metadata: JSON.stringify({ openLibrarySeriesAuto: true }),
    },
  });
};

export const resolveSeriesFromWorkKey = async (workKey: string): Promise<{ title: string; volume: number | null } | null> => {
  beLog("resolveSeriesFromWorkKey");
  if (!workKey.startsWith("/works/")) return null;
  const work = await fetchOpenLibraryJson(openLibraryKeyJsonUrl(workKey));
  return seriesInfoFromWorkJson(work);
};

export const resolveSeriesFromIsbns = async (isbns: string[]): Promise<{ title: string; volume: number | null } | null> => {
  beLog("resolveSeriesFromIsbns", { n: isbns.length });
  for (const raw of isbns.slice(0, 5)) {
    const isbn = String(raw).replace(/[^0-9Xx]/g, "");
    if (!isbn) continue;
    const data = await fetchOpenLibraryJson(openLibraryBooksByIsbnUrl(isbn));
    if (!data || typeof data !== "object") continue;
    const row = (data as Record<string, unknown>)[`ISBN:${isbn}`] ?? Object.values(data)[0];
    const hit = seriesFromBooksApiRow(row);
    if (hit) return hit;
  }
  return null;
};

export const seriesInfoFromWorkJson = async (
  work: unknown
): Promise<{ title: string; volume: number | null } | null> => {
  if (!work || typeof work !== "object") return null;
  const w = work as { series?: unknown };
  if (!w.series || !Array.isArray(w.series) || w.series.length === 0) return null;
  const first = w.series[0] as { name?: string; series?: { key?: string }; position?: unknown; volume?: unknown };
  let title: string | null = typeof first?.name === "string" && first.name.trim() ? first.name.trim() : null;
  const sk = first?.series?.key;
  if (typeof sk === "string") {
    const sdoc = await fetchOpenLibraryJson(openLibraryKeyJsonUrl(sk));
    if (typeof sdoc?.name === "string" && sdoc.name.trim()) title = sdoc.name.trim();
  }
  if (!title) return null;
  return { title, volume: parseVolume(first?.position ?? first?.volume) };
};

const seriesFromBooksApiRow = (row: any): { title: string; volume: number | null } | null => {
  const list = row?.series;
  if (!Array.isArray(list) || list.length === 0) return null;
  const first = list[0];
  const name = typeof first?.name === "string" ? first.name.trim() : "";
  if (!name) return null;
  return { title: name, volume: parseVolume(first?.volume) };
};

const parseVolume = (raw: unknown): number | null => {
  if (raw == null) return null;
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  const n = parseFloat(String(raw).replace(/[^\d.]/g, ""));
  return Number.isNaN(n) ? null : n;
};
