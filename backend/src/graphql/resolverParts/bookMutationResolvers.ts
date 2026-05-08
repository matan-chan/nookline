import type { PrismaClient } from "@prisma/client";
import { assertBookReadableBy, assertLibraryOwnedBy } from "../authzPrisma";
import type { GqlContext } from "../gqlContext";
import { requireGqlUser } from "../gqlContext";
import { unlinkBookMainAndCacheArtifacts } from "../../services/bookDiskArtifacts";
import { enrichBookRecord } from "../../services/openLibraryEnrichment";
import { createBookRecord } from "../../services/createBookRecord";
import { beLog } from "../../utils/beLog";
import { serializeBook, serializeProgress } from "../resolverSerialize";
import { deleteBookmarksHighlightsProgressForBooks } from "./bookCleanup";
import { ERR_BOOK_NOT_FOUND } from "./errors";

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
