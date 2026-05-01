import type { PrismaClient } from "@prisma/client";
import { assertBookReadableBy } from "../authzPrisma";
import type { GqlContext } from "../gqlContext";
import { requireGqlUser } from "../gqlContext";
import { beLog } from "../../utils/beLog";
import { serializeBookmark } from "../resolverSerialize";

const mapUserBookmarkRow = (r: { id: number; bookId: number; book: { title: string }; position: string; note: string | null; createdAt: Date }) => {
  beLog("mapUserBookmarkRow");
  return {
    id: r.id,
    bookId: r.bookId,
    bookTitle: r.book.title,
    position: r.position,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  };
};

export const bookmarkQueryResolvers = (prisma: PrismaClient) => ({
  bookmarks: async (_: unknown, { bookId }: { bookId: number }, ctx: GqlContext) => {
    beLog("query_bookmarks", { bookId });
    const u = requireGqlUser(ctx);
    await assertBookReadableBy(prisma, u.id, bookId);
    const items = await prisma.bookmark.findMany({ where: { bookId, userId: u.id } });
    return items.map(serializeBookmark);
  },

  userBookmarks: async (_: unknown, { userId }: { userId: number }, ctx: GqlContext) => {
    beLog("query_userBookmarks", { userId });
    const u = requireGqlUser(ctx);
    if (userId !== u.id) throw new Error("Forbidden");
    const rows = await prisma.bookmark.findMany({
      where: { userId: u.id, book: { library: { userId: u.id } } },
      include: { book: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapUserBookmarkRow);
  },
});

export const bookmarkMutationResolvers = (prisma: PrismaClient) => ({
  addBookmark: async (_: unknown, { input }: { input: any }, ctx: GqlContext) => {
    beLog("mutation_addBookmark", { bookId: input?.bookId });
    const u = requireGqlUser(ctx);
    await assertBookReadableBy(prisma, u.id, input.bookId);
    const b = await prisma.bookmark.create({ data: { ...input, userId: u.id } });
    return serializeBookmark(b);
  },

  deleteBookmark: async (_: unknown, { id }: { id: number }, ctx: GqlContext) => {
    beLog("mutation_deleteBookmark", { id });
    const u = requireGqlUser(ctx);
    const ex = await prisma.bookmark.findFirst({ where: { id, userId: u.id } });
    if (ex == null) return false;
    await prisma.bookmark.delete({ where: { id } });
    return true;
  },
});
