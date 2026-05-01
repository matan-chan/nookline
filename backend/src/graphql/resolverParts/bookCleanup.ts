import type { Prisma } from "@prisma/client";
import { beLog } from "../../utils/beLog";

export const deleteBookmarksHighlightsProgressForBooks = async (tx: Prisma.TransactionClient, bookIds: number[]) => {
  beLog("deleteBookmarksHighlightsProgressForBooks", { count: bookIds.length });
  if (bookIds.length === 0) return;
  await tx.bookmark.deleteMany({ where: { bookId: { in: bookIds } } });
  await tx.highlight.deleteMany({ where: { bookId: { in: bookIds } } });
  await tx.readingProgress.deleteMany({ where: { bookId: { in: bookIds } } });
};
