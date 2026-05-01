import type { PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";

const notFound = () => {
  throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });
};

export const assertLibraryOwnedBy = async (prisma: PrismaClient, userId: number, libraryId: number) => {
  const r = await prisma.library.findFirst({ where: { id: libraryId, userId } });
  if (r == null) notFound();
};

export const assertBookReadableBy = async (prisma: PrismaClient, userId: number, bookId: number) => {
  const b = await prisma.book.findFirst({
    where: { id: bookId, library: { userId } },
  });
  if (b == null) notFound();
};

export const getSeriesOrThrow = async (prisma: PrismaClient, userId: number, seriesId: number) => {
  const s = await prisma.series.findFirst({
    where: { id: seriesId, library: { userId } },
  });
  if (s == null) notFound();
  return s;
};

export const getBookOrThrow = async (prisma: PrismaClient, userId: number, bookId: number) => {
  const b = await prisma.book.findFirst({ where: { id: bookId, library: { userId } } });
  if (b == null) notFound();
  return b;
};
