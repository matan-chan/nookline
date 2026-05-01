import type { PrismaClient } from "@prisma/client";
import { assertBookReadableBy } from "../authzPrisma";
import type { GqlContext } from "../gqlContext";
import { requireGqlUser } from "../gqlContext";
import { beLog } from "../../utils/beLog";
import { serializeHighlight } from "../resolverSerialize";

const DEFAULT_HIGHLIGHT_COLOR = "#ba9eff";

const mapUserHighlightRow = (r: {
  id: number;
  bookId: number;
  book: { title: string };
  startPos: string;
  endPos: string;
  text: string;
  color: string;
  createdAt: Date;
}) => {
  beLog("mapUserHighlightRow", { id: r.id });
  return {
    id: r.id,
    bookId: r.bookId,
    bookTitle: r.book.title,
    startPos: r.startPos,
    endPos: r.endPos,
    text: r.text,
    color: r.color,
    createdAt: r.createdAt.toISOString(),
  };
};

export const highlightQueryResolvers = (prisma: PrismaClient) => ({
  highlights: async (_: unknown, { bookId }: { bookId: number }, ctx: GqlContext) => {
    beLog("query_highlights", { bookId });
    const u = requireGqlUser(ctx);
    await assertBookReadableBy(prisma, u.id, bookId);
    const items = await prisma.highlight.findMany({ where: { bookId, userId: u.id } });
    return items.map(serializeHighlight);
  },

  userHighlights: async (_: unknown, { userId }: { userId: number }, ctx: GqlContext) => {
    beLog("query_userHighlights", { userId });
    const u = requireGqlUser(ctx);
    if (userId !== u.id) throw new Error("Forbidden");
    const rows = await prisma.highlight.findMany({
      where: { userId: u.id, book: { library: { userId: u.id } } },
      include: { book: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapUserHighlightRow);
  },
});

export const highlightMutationResolvers = (prisma: PrismaClient) => ({
  addHighlight: async (_: unknown, { input }: { input: any }, ctx: GqlContext) => {
    beLog("mutation_addHighlight", { bookId: input?.bookId });
    const u = requireGqlUser(ctx);
    await assertBookReadableBy(prisma, u.id, input.bookId);
    const data = { color: DEFAULT_HIGHLIGHT_COLOR, ...input, userId: u.id };
    const h = await prisma.highlight.create({ data });
    return serializeHighlight(h);
  },

  deleteHighlight: async (_: unknown, { id }: { id: number }, ctx: GqlContext) => {
    beLog("mutation_deleteHighlight", { id });
    const u = requireGqlUser(ctx);
    const ex = await prisma.highlight.findFirst({ where: { id, userId: u.id } });
    if (ex == null) return false;
    await prisma.highlight.delete({ where: { id } });
    return true;
  },
});
