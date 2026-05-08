import type { PrismaClient } from "@prisma/client";
import type { GqlContext } from "../../../gqlContext";
import { requireGqlUser } from "../../../gqlContext";
import { beLog } from "../../../../utils/beLog";
import { serializeBook, serializeProgress } from "../../../resolverSerialize";
import { recommendedBooksForBook } from "../recs/bookRecommendations";

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
    return progressList.map((p) => ({ book: serializeBook(p.book), progress: serializeProgress(p) }));
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

  recommendedBooksForBook: async (_: unknown, { bookId, limit }: { bookId: number; limit?: number | null }, ctx: GqlContext) => {
    beLog("query_recommendedBooksForBook", { bookId, cap: limit ?? null });
    const u = requireGqlUser(ctx);
    return recommendedBooksForBook(prisma, u.id, bookId, limit);
  },
});
