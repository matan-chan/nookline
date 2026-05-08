import type { PrismaClient } from "@prisma/client";
import { assertLibraryOwnedBy, getSeriesOrThrow } from "../../authzPrisma";
import type { GqlContext } from "../../gqlContext";
import { requireGqlUser } from "../../gqlContext";
import { unlinkBookMainAndCacheArtifacts } from "../../../services/book/bookDiskArtifacts";
import { enrichSeriesRecord } from "../../../services/openLibrary/openLibraryEnrichment";
import { beLog } from "../../../utils/beLog";
import { serializeBook, serializeLibrary, serializeSeries } from "../../resolverSerialize";
import { deleteBookmarksHighlightsProgressForBooks } from "../book/cleanup/bookCleanup";
import { ERR_SERIES_NOT_FOUND } from "../errors";

export const seriesQueryResolvers = (prisma: PrismaClient) => ({
  seriesList: async (_: unknown, { libraryId }: { libraryId: number }, ctx: GqlContext) => {
    beLog("query_seriesList", { libraryId });
    const u = requireGqlUser(ctx);
    await assertLibraryOwnedBy(prisma, u.id, libraryId);
    const list = await prisma.series.findMany({
      where: { libraryId },
      include: { books: true },
    });
    return list.map(serializeSeries);
  },

  series: async (_: unknown, { id }: { id: number }, ctx: GqlContext) => {
    beLog("query_series", { id });
    const u = requireGqlUser(ctx);
    const s = await prisma.series.findFirst({
      where: { id, library: { userId: u.id } },
      include: { books: true },
    });
    return s ? serializeSeries(s) : null;
  },
});

export const seriesMutationResolvers = (prisma: PrismaClient) => ({
  createSeries: async (_: unknown, { input }: { input: any }, ctx: GqlContext) => {
    beLog("mutation_createSeries", { libraryId: input?.libraryId });
    const u = requireGqlUser(ctx);
    const libId = input?.libraryId != null ? Number(input.libraryId) : NaN;
    if (Number.isFinite(libId)) await assertLibraryOwnedBy(prisma, u.id, libId);
    else throw new Error("Library required");
    const s = await prisma.series.create({ data: input, include: { books: true } });
    return serializeSeries(s);
  },

  deleteSeries: async (_: unknown, { id }: { id: number }, ctx: GqlContext) => {
    beLog("mutation_deleteSeries", { id });
    const u = requireGqlUser(ctx);
    await getSeriesOrThrow(prisma, u.id, id);
    const books = await prisma.book.findMany({ where: { seriesId: id }, include: { library: true } });
    for (const b of books) unlinkBookMainAndCacheArtifacts(b);
    await prisma.$transaction(async (tx) => {
      const bookIds = books.map((b) => b.id);
      await deleteBookmarksHighlightsProgressForBooks(tx, bookIds);
      await tx.book.deleteMany({ where: { seriesId: id } });
      await tx.series.delete({ where: { id } });
    });
    return true;
  },

  enrichSeriesFromOpenLibrary: async (_: unknown, { id }: { id: number }, ctx: GqlContext) => {
    beLog("mutation_enrichSeriesFromOpenLibrary", { id });
    const u = requireGqlUser(ctx);
    await getSeriesOrThrow(prisma, u.id, id);
    await enrichSeriesRecord(prisma, id);
    const row = await prisma.series.findFirst({ where: { id, library: { userId: u.id } }, include: { books: true } });
    if (!row) throw new Error(ERR_SERIES_NOT_FOUND);
    return serializeSeries(row);
  },
});

export const Series = (prisma: PrismaClient) => ({
  books: async (parent: { id: number; books?: unknown[] }) => {
    if (Array.isArray(parent.books) && parent.books.length) return (parent.books as any[]).map(serializeBook);
    const list = await prisma.book.findMany({ where: { seriesId: parent.id } });
    return list.map(serializeBook);
  },
  library: async (parent: { libraryId: number }) => {
    const lib = await prisma.library.findUnique({ where: { id: parent.libraryId } });
    if (!lib) throw new Error("Library not found for series");
    return serializeLibrary(lib);
  },
});
