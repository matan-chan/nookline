import type { Book, PrismaClient } from "@prisma/client";
import { tryGenerateCoverWebp } from "./bookCoverFromFile";
import { resolveLibraryCoverCacheDir } from "../library/libraryPathResolve";
import { beLog } from "../../utils/beLog";
import { existsSync, mkdirSync } from "fs";
import { extname, join } from "path";

const DERIVED_COVER_PREFIX = "derived-cover-";
const PDF_EXT = ".pdf";
const EPUB_EXT = ".epub";

type BookWithLibraryPath = Book & { library: { path: string } };

export const libraryDerivedCoverAbsolutePath = (libraryPath: string | null | undefined, bookId: number) =>
  join(resolveLibraryCoverCacheDir(libraryPath), `${DERIVED_COVER_PREFIX}${bookId}.webp`);

const shouldGenerateCoverFromLocalFile = (book: Book, meta: Record<string, unknown> | null) => {
  const ol = meta?.openLibrary && typeof meta.openLibrary === "object" ? (meta.openLibrary as Record<string, unknown>) : null;
  const fetchFailed = Boolean(ol?.fetchFailed);
  const hasRemoteCover = typeof meta?.coverUrl === "string" && String(meta.coverUrl).trim().length > 0;
  const storedCover = typeof book.coverImagePath === "string" ? book.coverImagePath.trim() : "";
  const localCoverFileOk = storedCover.length > 0 && existsSync(storedCover);
  return !localCoverFileOk && (!hasRemoteCover || fetchFailed);
};

export const maybeGenerateDerivedCover = async (
  book: BookWithLibraryPath,
  meta: Record<string, unknown> | null,
  bookId: number,
  absFilePath: string,
  ext: string,
): Promise<string | null> => {
  beLog("maybeGenerateDerivedCover", { bookId });
  if (!shouldGenerateCoverFromLocalFile(book, meta)) return null;
  const coverDir = resolveLibraryCoverCacheDir(book.library.path);
  mkdirSync(coverDir, { recursive: true });
  const outCover = libraryDerivedCoverAbsolutePath(book.library.path, bookId);
  const ok = await tryGenerateCoverWebp(absFilePath, ext, outCover);
  return ok ? outCover : null;
};

export const persistBookDerivedCoverIfPossible = async (
  db: PrismaClient,
  bookId: number,
  resolveAbsFilePath: (libraryPath: string, storedFilePath: string) => string,
): Promise<string | null> => {
  beLog("persistBookDerivedCoverIfPossible", { bookId });
  const book = await db.book.findUnique({ where: { id: bookId }, include: { library: true } });
  if (!book) return null;
  const absFilePath = resolveAbsFilePath(book.library.path, book.filePath);
  const ext = extname(absFilePath).toLowerCase();
  if (ext !== PDF_EXT && ext !== EPUB_EXT) return null;
  if (!existsSync(absFilePath)) return null;
  const coverDir = resolveLibraryCoverCacheDir(book.library.path);
  mkdirSync(coverDir, { recursive: true });
  const outCover = libraryDerivedCoverAbsolutePath(book.library.path, bookId);
  const ok = await tryGenerateCoverWebp(absFilePath, ext, outCover);
  if (!ok) return null;
  await db.book.update({ where: { id: bookId }, data: { coverImagePath: outCover } });
  return outCover;
};
