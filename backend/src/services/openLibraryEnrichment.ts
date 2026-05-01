import { mergeBookOpenLibrary, mergeSeriesOpenLibrary } from "./openLibraryEnrichmentMerge";
import { isAlreadyEnriched, parseMeta } from "./openLibraryEnrichmentParse";
import type { EnrichmentPayload } from "./openLibraryEnrichmentTypes";
export type { EnrichmentPayload } from "./openLibraryEnrichmentTypes";
import { editionToWorkKey, loadWorkEnrichmentData } from "./openLibraryEnrichmentWorkData";
import {
  fetchOpenLibraryJson,
  OL_SEARCH_FIELDS_WORK_KEY,
  openLibrarySearchByTitleUrl,
} from "./openLibraryClient";
import { findOrCreateSeriesByTitle, resolveSeriesFromIsbns, seriesInfoFromWorkJson } from "./openLibrarySeries";
import { inferAndPersistPdfMarginStripRegexes } from "./bookPdfMarginStripPersist";
import { applyLocalBookFallback } from "./bookLocalFallback";
import { beLog } from "../utils/beLog";
import type { Book, PrismaClient } from "@prisma/client";

export { mergeBookOpenLibrary, mergeSeriesOpenLibrary } from "./openLibraryEnrichmentMerge";

export const enrichBookRecord = async (db: PrismaClient, bookId: number) => {
  beLog("enrichBookRecord", { bookId });
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) return null;
  const meta = parseMeta(book.metadata);
  if (isAlreadyEnriched(meta)) return book;
  const { author, hint } = openLibraryHintFromBookMeta(meta);
  const workKey = await resolveWorkKey(book.title, author, hint);
  if (!workKey) return persistBookMetadataWithFallback(db, bookId, bookOpenLibrarySearchFailedStub(meta));
  const bundle = await loadWorkEnrichmentData(workKey);
  if (!bundle) return persistBookMetadataWithFallback(db, bookId, bookOpenLibraryLoadFailedStub(meta, workKey));
  return finalizeEnrichedBook(db, bookId, book, meta, bundle);
};

export const enrichSeriesRecord = async (db: PrismaClient, seriesId: number) => {
  beLog("enrichSeriesRecord", { seriesId });
  const series = await db.series.findUnique({ where: { id: seriesId } });
  if (!series) return null;
  const meta = parseMeta(series.metadata);
  if (isAlreadyEnriched(meta)) return series;

  const hint = (meta && typeof meta.openLibraryWorkKey === "string" && meta.openLibraryWorkKey) || null;
  const workKey = await resolveWorkKey(series.title, null, hint);
  if (!workKey) {
    const stub = {
      ...(meta ?? {}),
      openLibrary: {
        enrichedAt: new Date().toISOString(),
        fetchFailed: true,
      },
    };
    return db.series.update({
      where: { id: seriesId },
      data: { metadata: JSON.stringify(stub) },
    });
  }

  const enrichment = await fetchWorkEnrichment(workKey);
  if (!enrichment) {
    return db.series.update({
      where: { id: seriesId },
      data: {
        metadata: JSON.stringify({
          ...(meta ?? {}),
          openLibrary: { enrichedAt: new Date().toISOString(), workKey, fetchFailed: true },
        }),
      },
    });
  }

  const merged = mergeSeriesOpenLibrary(meta, enrichment);
  const descUpdate = !series.description && enrichment.description ? enrichment.description.slice(0, 2000) : undefined;

  return db.series.update({
    where: { id: seriesId },
    data: {
      metadata: JSON.stringify(merged),
      ...(descUpdate ? { description: descUpdate } : {}),
    },
  });
};

export const fetchWorkEnrichment = async (workKey: string): Promise<EnrichmentPayload | null> => {
  beLog("fetchWorkEnrichment", { workKey });
  const bundle = await loadWorkEnrichmentData(workKey);
  return bundle?.enrichment ?? null;
};

export const resolveWorkKey = async (title: string, author?: string | null, hintKey?: string | null): Promise<string | null> => {
  beLog("resolveWorkKey", { hasHint: Boolean(hintKey) });
  if (hintKey) {
    if (hintKey.startsWith("/works/")) return hintKey;
    if (hintKey.startsWith("/books/")) return editionToWorkKey(hintKey);
  }
  const url = openLibrarySearchByTitleUrl(title, author, 1, OL_SEARCH_FIELDS_WORK_KEY);
  const data = await fetchOpenLibraryJson(url);
  const key = data?.docs?.[0]?.key;
  if (typeof key !== "string") return null;
  if (key.startsWith("/works/")) return key;
  if (key.startsWith("/books/")) return editionToWorkKey(key);
  return null;
};

const finalizeEnrichedBook = async (
  db: PrismaClient,
  bookId: number,
  book: Book,
  meta: Record<string, unknown> | null,
  bundle: { enrichment: EnrichmentPayload; work: unknown }
) => {
  beLog("finalizeEnrichedBook", { bookId });
  const { enrichment, work } = bundle;
  const merged = mergeBookOpenLibrary(meta, enrichment);
  const { seriesId, volumeNumber } = await resolveSeriesAttachmentFromWorkAndMeta(db, book, meta, work);
  await db.book.update({
    where: { id: bookId },
    data: {
      metadata: JSON.stringify(merged),
      ...(seriesId && !book.seriesId ? { seriesId } : {}),
      ...(volumeNumber != null && book.volumeNumber == null ? { volumeNumber } : {}),
    },
  });
  await applyLocalBookFallback(db, bookId);
  await inferAndPersistPdfMarginStripRegexes(db, bookId);
  return db.book.findUnique({ where: { id: bookId } });
};

const persistBookMetadataWithFallback = async (db: PrismaClient, bookId: number, stub: Record<string, unknown>) => {
  beLog("persistBookMetadataWithFallback", { bookId });
  await db.book.update({
    where: { id: bookId },
    data: { metadata: JSON.stringify(stub) },
  });
  await applyLocalBookFallback(db, bookId);
  await inferAndPersistPdfMarginStripRegexes(db, bookId);
  return db.book.findUnique({ where: { id: bookId } });
};

const bookOpenLibrarySearchFailedStub = (meta: Record<string, unknown> | null) => ({
  ...(meta ?? {}),
  openLibrary: {
    ...(typeof meta?.openLibrary === "object" ? (meta!.openLibrary as object) : {}),
    enrichedAt: new Date().toISOString(),
    fetchFailed: true,
  },
});

const bookOpenLibraryLoadFailedStub = (meta: Record<string, unknown> | null, workKey: string) => ({
  ...(meta ?? {}),
  openLibrary: {
    enrichedAt: new Date().toISOString(),
    workKey,
    fetchFailed: true,
  },
});

const openLibraryHintFromBookMeta = (meta: Record<string, unknown> | null) => {
  const author = meta && typeof meta.author === "string" ? meta.author : null;
  const hint =
    (meta && typeof meta.openLibraryWorkKey === "string" && meta.openLibraryWorkKey) ||
    (meta?.openLibrary && typeof (meta.openLibrary as { workKey?: string }).workKey === "string"
      ? (meta.openLibrary as { workKey: string }).workKey
      : null);
  return { author, hint };
};

const resolveSeriesAttachmentFromWorkAndMeta = async (
  db: PrismaClient,
  book: Book,
  meta: Record<string, unknown> | null,
  work: unknown
) => {
  beLog("resolveSeriesAttachmentFromWorkAndMeta", { bookId: book.id });
  let seriesId = book.seriesId ?? undefined;
  let volumeNumber = book.volumeNumber ?? undefined;
  if (seriesId) return { seriesId, volumeNumber };
  let sinfo = await seriesInfoFromWorkJson(work);
  if (!sinfo) {
    const raw = meta?.isbn;
    const isbns: string[] = [];
    if (Array.isArray(raw)) raw.forEach((x) => typeof x === "string" && isbns.push(x));
    else if (typeof raw === "string" && raw.trim()) isbns.push(raw.trim());
    if (isbns.length) sinfo = await resolveSeriesFromIsbns(isbns);
  }
  if (sinfo) {
    const srow = await findOrCreateSeriesByTitle(db, book.libraryId, sinfo.title);
    seriesId = srow.id;
    if (sinfo.volume != null && volumeNumber == null) volumeNumber = sinfo.volume;
  }
  return { seriesId, volumeNumber };
};
