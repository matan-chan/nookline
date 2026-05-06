import type { PrismaClient } from "@prisma/client";
import { assertBookReadableBy, assertLibraryOwnedBy } from "../authzPrisma";
import type { GqlContext } from "../gqlContext";
import { requireGqlUser } from "../gqlContext";
import { unlinkBookMainAndCacheArtifacts } from "../../services/bookDiskArtifacts";
import { enrichBookRecord } from "../../services/openLibraryEnrichment";
import { createBookRecord } from "../../services/createBookRecord";
import { beLog } from "../../utils/beLog";
import {
  mergeRecommendationIdsWithFallback,
  parseBookMetadata,
  pickRecommendedBookIds,
} from "../../services/recommendedBooksForBook";
import {
  resolveBookFileExt,
  serializeBook,
  serializeLibrary,
  serializeProgress,
  serializeSeries,
} from "../resolverSerialize";
import { deleteBookmarksHighlightsProgressForBooks } from "./bookCleanup";
import { ERR_BOOK_NOT_FOUND } from "./errors";

const DEFAULT_RECENT_ADDED = 20;
const DEFAULT_FAVORITE_BOOKS = 48;

export const bookQueryResolvers = (prisma: PrismaClient) => ({
  book: async (_: unknown, { id }: { id: number }, ctx: GqlContext) => {
    beLog("query_book", { id });
    const u = requireGqlUser(ctx);
    const b = await prisma.book.findFirst({ where: { id, library: { userId: u.id } } });
    return b ? serializeBook(b) : null;
  },

  recentlyAdded: async (_: unknown, { limit }: { limit?: number }, ctx: GqlContext) => {
    beLog("query_recentlyAdded", { limit: limit ?? DEFAULT_RECENT_ADDED });
    const u = requireGqlUser(ctx);
    const books = await prisma.book.findMany({
      where: { library: { userId: u.id } },
      orderBy: { createdAt: "desc" },
      take: limit ?? DEFAULT_RECENT_ADDED,
    });
    return books.map(serializeBook);
  },

  onDeck: async (_: unknown, { userId }: { userId: number }, ctx: GqlContext) => {
    beLog("query_onDeck", { userId });
    const u = requireGqlUser(ctx);
    if (userId !== u.id) throw new Error("Forbidden");
    const progressList = await prisma.readingProgress.findMany({
      where: { userId: u.id, percentage: { gt: 0, lt: 100 }, book: { library: { userId: u.id } } },
      include: { book: true },
      orderBy: { updatedAt: "desc" },
    });
    return progressList.map((p) => ({
      book: serializeBook(p.book),
      progress: serializeProgress(p),
    }));
  },

  favoriteBooks: async (_: unknown, { userId, limit }: { userId: number; limit?: number | null }, ctx: GqlContext) => {
    beLog("query_favoriteBooks", { userId, limit: limit ?? DEFAULT_FAVORITE_BOOKS });
    const u = requireGqlUser(ctx);
    if (userId !== u.id) throw new Error("Forbidden");
    const rows = await prisma.bookFavorite.findMany({
      where: { userId: u.id, book: { library: { userId: u.id } } },
      include: { book: true },
      orderBy: { createdAt: "desc" },
      take: limit ?? DEFAULT_FAVORITE_BOOKS,
    });
    return rows.map((r) => serializeBook(r.book));
  },

  recommendedBooksForBook: async (
    _: unknown,
    { bookId, limit }: { bookId: number; limit?: number | null },
    ctx: GqlContext,
  ) => {
    const cap = Math.min(20, Math.max(1, limit ?? 10));
    const sourceBookId = Math.trunc(Number(bookId));
    if (!Number.isFinite(sourceBookId) || sourceBookId < 1) return [];
    beLog("query_recommendedBooksForBook", { bookId: sourceBookId, cap });
    const u = requireGqlUser(ctx);
    const ownedLibraryIds = (
      await prisma.library.findMany({ where: { userId: u.id }, select: { id: true } })
    ).map((row) => row.id);
    if (ownedLibraryIds.length === 0) return [];
    const source = await prisma.book.findFirst({
      where: { id: sourceBookId, libraryId: { in: ownedLibraryIds } },
    });
    if (!source) return [];
    const sourceMeta = parseBookMetadata(source.metadata);
    const userPool = await prisma.book.findMany({
      where: { id: { not: sourceBookId }, libraryId: { in: ownedLibraryIds } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, metadata: true, libraryId: true },
    });
    if (userPool.length === 0) return [];
    const sameLib = userPool.filter((b) => b.libraryId === source.libraryId);
    const metaOnly = userPool.map(({ id, metadata }) => ({ id, metadata }));
    const scoredIds = pickRecommendedBookIds(sourceMeta, metaOnly, sourceBookId, cap);
    const firstPool = sameLib.length ? sameLib : userPool;
    let ids = mergeRecommendationIdsWithFallback(scoredIds, firstPool, cap);
    if (ids.length < cap) ids = mergeRecommendationIdsWithFallback(ids, userPool, cap);
    const full = await prisma.book.findMany({
      where: { id: { in: ids }, libraryId: { in: ownedLibraryIds } },
    });
    const byId = new Map(full.map((b) => [b.id, b]));
    return ids
      .map((id) => byId.get(id))
      .filter((b): b is NonNullable<typeof b> => Boolean(b))
      .map(serializeBook);
  },
});

export const bookMutationResolvers = (prisma: PrismaClient) => ({
  createBook: async (_: unknown, { input }: { input: any }, ctx: GqlContext) => {
    beLog("mutation_createBook", { libraryId: input?.libraryId });
    const u = requireGqlUser(ctx);
    const lid = input?.libraryId != null ? Number(input.libraryId) : NaN;
    if (Number.isFinite(lid)) await assertLibraryOwnedBy(prisma, u.id, lid);
    else throw new Error("Library required");
    const row = await createBookRecord(prisma, input);
    return serializeBook(row);
  },

  deleteBook: async (_: unknown, { id }: { id: number }, ctx: GqlContext) => {
    beLog("mutation_deleteBook", { id });
    const u = requireGqlUser(ctx);
    const row = await prisma.book.findFirst({ where: { id, library: { userId: u.id } }, include: { library: true } });
    if (!row) return false;
    unlinkBookMainAndCacheArtifacts(row);
    await prisma.$transaction(async (tx) => {
      await deleteBookmarksHighlightsProgressForBooks(tx, [id]);
      await tx.book.delete({ where: { id } });
    });
    return true;
  },

  enrichBookFromOpenLibrary: async (_: unknown, { id }: { id: number }, ctx: GqlContext) => {
    beLog("mutation_enrichBookFromOpenLibrary", { id });
    const u = requireGqlUser(ctx);
    await assertBookReadableBy(prisma, u.id, id);
    await enrichBookRecord(prisma, id);
    const row = await prisma.book.findFirst({ where: { id, library: { userId: u.id } } });
    if (!row) throw new Error(ERR_BOOK_NOT_FOUND);
    return serializeBook(row);
  },

  setBookFavorite: async (_: unknown, { userId, bookId, liked }: { userId: number; bookId: number; liked: boolean }, ctx: GqlContext) => {
    beLog("mutation_setBookFavorite", { userId, bookId, liked });
    const u = requireGqlUser(ctx);
    if (userId !== u.id) throw new Error("Forbidden");
    const row = await prisma.book.findFirst({ where: { id: bookId, library: { userId: u.id } } });
    if (!row) throw new Error(ERR_BOOK_NOT_FOUND);
    if (liked)
      await prisma.bookFavorite.upsert({
        where: { userId_bookId: { userId: u.id, bookId } },
        create: { userId: u.id, bookId },
        update: {},
      });
    else await prisma.bookFavorite.deleteMany({ where: { userId: u.id, bookId } });
    return serializeBook(row);
  },

  updateReadingProgress: async (_: unknown, { input }: { input: any }, ctx: GqlContext) => {
    beLog("mutation_updateReadingProgress", { userId: input?.userId, bookId: input?.bookId });
    const u = requireGqlUser(ctx);
    if (input.userId !== u.id) throw new Error("Forbidden");
    await assertBookReadableBy(prisma, u.id, input.bookId);
    const p = await prisma.readingProgress.upsert({
      where: { userId_bookId: { userId: u.id, bookId: input.bookId } },
      update: { position: input.position, percentage: input.percentage },
      create: { ...input, userId: u.id },
    });
    return serializeProgress(p);
  },
});

export const Book = (prisma: PrismaClient) => ({
  fileExt: resolveBookFileExt,
  library: async (parent: { libraryId: number }) => {
    beLog("Book_library", { libraryId: parent.libraryId });
    const lib = await prisma.library.findUnique({ where: { id: parent.libraryId } });
    if (!lib) throw new Error("Library not found for book");
    return serializeLibrary(lib);
  },
  series: async (parent: { seriesId: number | null }) => {
    if (parent.seriesId == null) return null;
    beLog("Book_series", { seriesId: parent.seriesId });
    const s = await prisma.series.findUnique({ where: { id: parent.seriesId } });
    return s ? serializeSeries(s) : null;
  },
  readingProgressForUser: async (parent: { id: number }, { userId }: { userId: number }, ctx: GqlContext) => {
    beLog("Book_readingProgressForUser", { bookId: parent.id, userId });
    const u = requireGqlUser(ctx);
    if (userId !== u.id) return null;
    const p = await prisma.readingProgress.findUnique({
      where: { userId_bookId: { userId: u.id, bookId: parent.id } },
    });
    return p ? serializeProgress(p) : null;
  },
  isFavoriteForUser: async (parent: { id: number }, { userId }: { userId: number }, ctx: GqlContext) => {
    beLog("Book_isFavoriteForUser", { bookId: parent.id, userId });
    const u = requireGqlUser(ctx);
    if (userId !== u.id) return false;
    const f = await prisma.bookFavorite.findUnique({
      where: { userId_bookId: { userId: u.id, bookId: parent.id } },
    });
    return Boolean(f);
  },
});
