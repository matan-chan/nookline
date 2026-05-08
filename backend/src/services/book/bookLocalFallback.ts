import type { Book, PrismaClient } from "@prisma/client";
import { guessPdfTitleAuthorFromFirstPageText } from "../pdf/pdfFirstPageTextInference";
import { libraryDerivedCoverAbsolutePath, maybeGenerateDerivedCover, persistBookDerivedCoverIfPossible as persistDerivedCover } from "./bookLocalFallbackCover";
import {
  buildFilenameInference,
  emptyPdfGuess,
  loadPdfEmbeddedMetadataIfPdf,
  mergeLocalFallbackIntoMetadata,
  parseMeta,
  pickFallbackAuthor,
  pickRepairedTitle,
} from "./bookLocalFallbackMetadata";
import { getUploadBaseDir, resolveLibraryContentDir } from "../library/libraryPathResolve";
import { beLog, beLogErr } from "../../utils/beLog";
import { statSync } from "fs";
import { extname, isAbsolute, normalize, resolve } from "path";

const EPUB_EXT = ".epub";
const PDF_EXT = ".pdf";

const fallbackLocks = new Map<number, Promise<Book | null>>();

export const resolveBookFileOnDisk = (libraryPath: string, storedFilePath: string) => {
  const trimmed = storedFilePath.trim();
  if (!trimmed) return trimmed;
  if (isAbsolute(trimmed)) return resolve(normalize(trimmed));
  return resolve(resolveLibraryContentDir(getUploadBaseDir(), libraryPath), normalize(trimmed));
};

export const persistBookDerivedCoverIfPossible = (db: PrismaClient, bookId: number) =>
  persistDerivedCover(db, bookId, resolveBookFileOnDisk);

export const applyLocalBookFallback = async (db: PrismaClient, bookId: number): Promise<Book | null> => {
  beLog("applyLocalBookFallback", { bookId });
  const running = fallbackLocks.get(bookId);
  if (running) return running;
  const p = runApplyLocalBookFallback(db, bookId).finally(() => {
    if (fallbackLocks.get(bookId) === p) fallbackLocks.delete(bookId);
  });
  fallbackLocks.set(bookId, p);
  return p;
};

const tryStatFileSize = (absFilePath: string): number | null => {
  try {
    return statSync(absFilePath).size;
  } catch (e) {
    beLogErr("tryStatFileSize", e, { path: absFilePath.slice(0, 120) });
    return null;
  }
};

const buildFallbackDbUpdate = (book: Book, mergedMeta: Record<string, unknown>, newCoverPath: string | null, nextTitle: string | null) => {
  const data: { coverImagePath?: string; title?: string; metadata: string } = { metadata: JSON.stringify(mergedMeta) };
  if (newCoverPath) data.coverImagePath = newCoverPath;
  if (nextTitle && nextTitle !== book.title) data.title = nextTitle;
  const metaChanged = data.metadata !== (book.metadata ?? "");
  const coverChanged = Boolean(newCoverPath);
  const titleChanged = Boolean(nextTitle && nextTitle !== book.title);
  return { hasChanges: metaChanged || coverChanged || titleChanged, data };
};

const runApplyLocalBookFallback = async (db: PrismaClient, bookId: number): Promise<Book | null> => {
  beLog("runApplyLocalBookFallback", { bookId });
  const book = await db.book.findUnique({ where: { id: bookId }, include: { library: true } });
  if (!book) return null;
  const absFilePath = resolveBookFileOnDisk(book.library.path, book.filePath);
  const meta = parseMeta(book.metadata);
  const ext = extname(absFilePath).toLowerCase();
  if (ext !== PDF_EXT && ext !== EPUB_EXT) return book;
  const fileSize = tryStatFileSize(absFilePath);
  if (fileSize == null) return book;
  const inference = buildFilenameInference(absFilePath, book.title);
  const [pdfEmb, pdfTextGuess] = await Promise.all([
    loadPdfEmbeddedMetadataIfPdf(ext, absFilePath, fileSize),
    ext === PDF_EXT ? guessPdfTitleAuthorFromFirstPageText(absFilePath, fileSize) : Promise.resolve(emptyPdfGuess()),
  ]);
  const newCoverPath = await maybeGenerateDerivedCover(book, meta, bookId, absFilePath, ext);
  const nextTitle = pickRepairedTitle(inference.repairTitle, pdfEmb, pdfTextGuess, inference.inferred);
  const nextAuthor = pickFallbackAuthor(meta, pdfEmb, pdfTextGuess, inference.inferred);
  const mergedMeta = mergeLocalFallbackIntoMetadata(meta, inference.slug, inference.inferred, nextAuthor, newCoverPath, pdfTextGuess);
  const payload = buildFallbackDbUpdate(book, mergedMeta, newCoverPath, nextTitle);
  if (!payload.hasChanges) return book;
  return db.book.update({ where: { id: bookId }, data: payload.data });
};

export { libraryDerivedCoverAbsolutePath };
