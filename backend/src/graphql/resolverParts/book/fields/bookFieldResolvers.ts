import type { PrismaClient } from "@prisma/client";
import type { GqlContext } from "../../../gqlContext";
import { requireGqlUser } from "../../../gqlContext";
import { beLog } from "../../../../utils/beLog";
import { resolveBookFileExt, serializeLibrary, serializeProgress, serializeSeries } from "../../../resolverSerialize";

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
