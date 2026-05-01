import { inferAndPersistPdfMarginStripRegexes } from "./bookPdfMarginStripPersist";
import { applyLocalBookFallback } from "./bookLocalFallback";
import type { Book, PrismaClient } from "@prisma/client";
import { beLog, beLogErr } from "../utils/beLog";

export type CreateBookInput = {
  libraryId: number;
  title: string;
  filePath: string;
  coverImagePath?: string | null;
  metadata?: string | null;
  openLibrarySeriesName?: string | null;
  seriesId?: number | null;
  volumeNumber?: number | null;
};

export const createBookRecord = async (db: PrismaClient, input: CreateBookInput): Promise<Book> => {
  beLog("createBookRecord", { libraryId: input.libraryId });
  const seriesId = await resolveSeriesIdForCreate(db, input);
  const b = await db.book.create({
    data: {
      libraryId: input.libraryId,
      seriesId: seriesId ?? null,
      title: input.title,
      filePath: input.filePath,
      coverImagePath: input.coverImagePath ?? null,
      volumeNumber: input.volumeNumber ?? null,
      metadata: input.metadata ?? null,
    },
  });
  try {
    await applyLocalBookFallback(db, b.id);
  } catch (e) {
    beLogErr("createBookRecord_applyLocalBookFallback", e, { bookId: b.id });
  }
  try {
    await inferAndPersistPdfMarginStripRegexes(db, b.id);
  } catch (e) {
    beLogErr("createBookRecord_inferPdfMargins", e, { bookId: b.id });
  }
  const row = await db.book.findUnique({ where: { id: b.id } });
  return row ?? b;
};

const resolveSeriesIdForCreate = async (db: PrismaClient, input: CreateBookInput): Promise<number | null | undefined> => {
  beLog("resolveSeriesIdForCreate", { libraryId: input.libraryId });
  let seriesId: number | null | undefined = input.seriesId;
  const autoSeries = typeof input.openLibrarySeriesName === "string" ? input.openLibrarySeriesName.trim() : "";
  if (seriesId || !autoSeries) return seriesId;
  const existing = await db.series.findFirst({
    where: { libraryId: input.libraryId, title: autoSeries },
  });
  const row =
    existing ??
    (await db.series.create({
      data: {
        libraryId: input.libraryId,
        title: autoSeries,
        status: "ONGOING",
        metadata: JSON.stringify({ openLibrarySeriesAuto: true }),
      },
    }));
  return row.id;
};
