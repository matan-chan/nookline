import type { PrismaClient } from "@prisma/client";
import { mergeRecommendationIdsWithFallback, parseBookMetadata, pickRecommendedBookIds } from "../../services/recommendedBooksForBook";
import { serializeBook } from "../resolverSerialize";

const RECOMMEND_POOL_LIMIT = 500;
const RECOMMEND_DEFAULT_LIMIT = 10;
const RECOMMEND_MAX_LIMIT = 20;

const sanitizeLimit = (limit?: number | null) => Math.min(RECOMMEND_MAX_LIMIT, Math.max(1, limit ?? RECOMMEND_DEFAULT_LIMIT));

const sanitizeBookId = (bookId: number) => {
  const id = Math.trunc(Number(bookId));
  return Number.isFinite(id) && id >= 1 ? id : null;
};

const fetchOwnedLibraryIds = async (prisma: PrismaClient, userId: number) =>
  (await prisma.library.findMany({ where: { userId }, select: { id: true } })).map((row) => row.id);

const fetchUserBookPool = async (prisma: PrismaClient, ownedLibraryIds: number[], excludeBookId: number) =>
  prisma.book.findMany({
    where: { id: { not: excludeBookId }, libraryId: { in: ownedLibraryIds } },
    orderBy: { createdAt: "desc" },
    take: RECOMMEND_POOL_LIMIT,
    select: { id: true, metadata: true, libraryId: true },
  });

const resolveRecommendedIds = (
  source: { id: number; libraryId: number; metadata: string | null },
  pool: { id: number; metadata: string | null; libraryId: number }[],
  cap: number,
) => {
  const sourceMeta = parseBookMetadata(source.metadata);
  const sameLib = pool.filter((b) => b.libraryId === source.libraryId);
  const metaOnly = pool.map(({ id, metadata }) => ({ id, metadata }));
  const scoredIds = pickRecommendedBookIds(sourceMeta, metaOnly, source.id, cap);
  const firstPool = sameLib.length ? sameLib : pool;
  let ids = mergeRecommendationIdsWithFallback(scoredIds, firstPool, cap);
  if (ids.length < cap) ids = mergeRecommendationIdsWithFallback(ids, pool, cap);
  return ids;
};

export const recommendedBooksForBook = async (prisma: PrismaClient, userId: number, bookId: number, limit?: number | null) => {
  const sourceBookId = sanitizeBookId(bookId);
  if (sourceBookId == null) return [];
  const cap = sanitizeLimit(limit);
  const ownedLibraryIds = await fetchOwnedLibraryIds(prisma, userId);
  if (ownedLibraryIds.length === 0) return [];
  const source = await prisma.book.findFirst({ where: { id: sourceBookId, libraryId: { in: ownedLibraryIds } } });
  if (!source) return [];
  const userPool = await fetchUserBookPool(prisma, ownedLibraryIds, sourceBookId);
  if (userPool.length === 0) return [];
  const ids = resolveRecommendedIds(source, userPool, cap);
  const full = await prisma.book.findMany({ where: { id: { in: ids }, libraryId: { in: ownedLibraryIds } } });
  const byId = new Map(full.map((b) => [b.id, b]));
  return ids
    .map((id) => byId.get(id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .map(serializeBook);
};
