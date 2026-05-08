import type { PrismaClient } from "@prisma/client";
import { assertLibraryOwnedBy } from "../../authzPrisma";
import type { GqlContext } from "../../gqlContext";
import { requireGqlUser } from "../../gqlContext";
import { unlinkBookMainAndCacheArtifacts } from "../../../services/book/bookDiskArtifacts";
import { normalizeLibraryBannerIndex, randomLibraryBannerIndex } from "../../../constants/libraryBanner";
import { removeLibraryDiskFolderIfSafe } from "../../../services/library/libraryDiskRemove";
import { syncLibraryBooksFromDisk } from "../../../services/library/libraryDiskSync";
import { beLog } from "../../../utils/beLog";
import {
  libraryWithSeriesBooks,
  newestBookFromLibraryParent,
  serializeBook,
  serializeLibrary,
  serializeSeries,
} from "../../resolverSerialize";
import { deleteBookmarksHighlightsProgressForBooks } from "../book/cleanup/bookCleanup";

export const libraryQueryResolvers = (prisma: PrismaClient) => ({
  libraries: async (_: unknown, __: unknown, ctx: GqlContext) => {
    beLog("query_libraries");
    if (ctx.user == null) return [];
    const libs = await prisma.library.findMany({ where: { userId: ctx.user.id }, include: libraryWithSeriesBooks });
    return libs.map(serializeLibrary);
  },

  library: async (_: unknown, { id }: { id: number }, ctx: GqlContext) => {
    beLog("query_library", { id });
    const u = requireGqlUser(ctx);
    const lib = await prisma.library.findFirst({
      where: { id, userId: u.id },
      include: libraryWithSeriesBooks,
    });
    return lib ? serializeLibrary(lib) : null;
  },
});

export const libraryMutationResolvers = (prisma: PrismaClient) => ({
  createLibrary: async (_: unknown, { input }: { input: any }, ctx: GqlContext) => {
    beLog("mutation_createLibrary");
    const u = requireGqlUser(ctx);
    const chosen = normalizeLibraryBannerIndex(input.bannerIndex);
    const data: {
      userId: number;
      name: string;
      path: string;
      type: string;
      bannerIndex: number;
      customLibraryBannerId?: number | null;
    } = {
      userId: u.id,
      name: String(input.name).trim(),
      path: String(input.path).trim(),
      type: String(input.type).trim(),
      bannerIndex: chosen ?? randomLibraryBannerIndex(),
    };
    const rawCid = input.customLibraryBannerId;
    if (rawCid !== undefined && rawCid !== null) {
      const cid = Number(rawCid);
      if (Number.isFinite(cid) && cid > 0) data.customLibraryBannerId = cid;
    }
    const lib = await prisma.library.create({
      data,
      include: libraryWithSeriesBooks,
    });
    return serializeLibrary(lib);
  },

  updateLibrary: async (_: unknown, { id, input }: { id: number; input: Record<string, unknown> }, ctx: GqlContext) => {
    beLog("mutation_updateLibrary", { id });
    const u = requireGqlUser(ctx);
    await assertLibraryOwnedBy(prisma, u.id, id);
    const data: { name: string; path: string; type: string; bannerIndex?: number; customLibraryBannerId?: number | null } = {
      name: String(input.name).trim(),
      path: String(input.path).trim(),
      type: String(input.type).trim(),
    };
    const idx = normalizeLibraryBannerIndex(input.bannerIndex);
    if (idx !== null) data.bannerIndex = idx;
    if ("customLibraryBannerId" in input) {
      const v = (input as { customLibraryBannerId?: number | null }).customLibraryBannerId;
      if (v === null || v === undefined) data.customLibraryBannerId = null;
      else {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) data.customLibraryBannerId = n;
      }
    }
    const lib = await prisma.library.update({
      where: { id },
      data,
      include: libraryWithSeriesBooks,
    });
    return serializeLibrary(lib);
  },

  deleteLibrary: async (_: unknown, { id }: { id: number }, ctx: GqlContext) => {
    beLog("mutation_deleteLibrary", { id });
    const u = requireGqlUser(ctx);
    const lib = await prisma.library.findFirst({ where: { id, userId: u.id } });
    if (!lib) return false;
    const books = await prisma.book.findMany({ where: { libraryId: id }, include: { library: true } });
    for (const b of books) unlinkBookMainAndCacheArtifacts(b);
    removeLibraryDiskFolderIfSafe(lib.path);
    await prisma.$transaction(async (tx) => {
      const bookIds = books.map((b) => b.id);
      await deleteBookmarksHighlightsProgressForBooks(tx, bookIds);
      await tx.library.delete({ where: { id } });
    });
    return true;
  },

  syncLibraryFromDisk: async (_: unknown, { libraryId }: { libraryId: number }, ctx: GqlContext) => {
    beLog("mutation_syncLibraryFromDisk", { libraryId });
    const u = requireGqlUser(ctx);
    await assertLibraryOwnedBy(prisma, u.id, libraryId);
    const books = await syncLibraryBooksFromDisk(prisma, libraryId);
    return books.map(serializeBook);
  },
});

const collectLibraryBooksNewestFirst = (parent: { books?: any[]; series?: { books?: any[] }[] }) => {
  const direct = parent.books ?? [];
  const nested = (parent.series ?? []).flatMap((s) => s.books ?? []);
  const byId = new Map<number, (typeof direct)[number]>();
  for (const b of [...direct, ...nested]) {
    if (!byId.has(b.id)) byId.set(b.id, b);
  }
  return [...byId.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const Library = (prisma: PrismaClient) => ({
  series: (parent: any) => parent.series?.map(serializeSeries) ?? [],
  books: (parent: any) => parent.books?.map(serializeBook) ?? [],
  previewBook: async (parent: { id: number; books?: any[]; series?: { books?: any[] }[] }) => {
    beLog("Library_previewBook", { libraryId: parent.id });
    const fromParent = newestBookFromLibraryParent(parent);
    if (fromParent) return serializeBook(fromParent);
    const book = await prisma.book.findFirst({
      where: { libraryId: parent.id },
      orderBy: { createdAt: "desc" },
    });
    return book ? serializeBook(book) : null;
  },
  previewBooks: async (parent: { id: number; books?: any[]; series?: { books?: any[] }[] }, { limit }: { limit?: number | null }) => {
    const cap = Math.min(Math.max(limit == null || Number.isNaN(Number(limit)) ? 3 : Number(limit), 1), 5);
    const fromParent = collectLibraryBooksNewestFirst(parent);
    const slice = fromParent.slice(0, cap);
    if (slice.length > 0) return slice.map(serializeBook);
    const rows = await prisma.book.findMany({
      where: { libraryId: parent.id },
      orderBy: { createdAt: "desc" },
      take: cap,
    });
    return rows.map(serializeBook);
  },
});
