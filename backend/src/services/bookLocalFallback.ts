import type { Book, PrismaClient } from "@prisma/client";
import { inferFromFilenameSlug, stripUploadTimestamp, titleLooksLikeRawFilename, type FilenameInference } from "./bookFilenameInference";
import { guessPdfTitleAuthorFromFirstPageText, type PdfPlainTextGuess } from "./pdfFirstPageTextInference";
import { extractPdfEmbeddedMetadata } from "./pdfEmbeddedMetadata";
import { tryGenerateCoverWebp } from "./bookCoverFromFile";
import { getUploadBaseDir, resolveLibraryContentDir, resolveLibraryCoverCacheDir } from "./libraryPathResolve";
import { beLog, beLogErr } from "../utils/beLog";
import { existsSync, mkdirSync, statSync } from "fs";
import { extname, isAbsolute, join, normalize, resolve } from "path";

const DERIVED_COVER_PREFIX = "derived-cover-";
const EPUB_EXT = ".epub";
const PDF_EXT = ".pdf";

const fallbackLocks = new Map<number, Promise<Book | null>>();

type PdfEmbeddedMeta = { title: string | null; author: string | null };

const emptyPdfGuess = (): PdfPlainTextGuess => ({ title: null, author: null });

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

export const persistBookDerivedCoverIfPossible = async (db: PrismaClient, bookId: number): Promise<string | null> => {
  beLog("persistBookDerivedCoverIfPossible", { bookId });
  const book = await db.book.findUnique({ where: { id: bookId }, include: { library: true } });
  if (!book) return null;
  const absFilePath = resolveBookFileOnDisk(book.library.path, book.filePath);
  const ext = extname(absFilePath).toLowerCase();
  if (ext !== PDF_EXT && ext !== EPUB_EXT) return null;
  if (!existsSync(absFilePath)) return null;
  const coverDir = resolveLibraryCoverCacheDir(book.library.path);
  mkdirSync(coverDir, { recursive: true });
  const outCover = libraryDerivedCoverAbsolutePath(book.library.path, bookId);
  const ok = await tryGenerateCoverWebp(absFilePath, ext, outCover);
  if (!ok) return null;
  await db.book.update({
    where: { id: bookId },
    data: { coverImagePath: outCover },
  });
  return outCover;
};

export const resolveBookFileOnDisk = (libraryPath: string, storedFilePath: string) => {
  const trimmed = storedFilePath.trim();
  if (!trimmed) return trimmed;
  if (isAbsolute(trimmed)) return resolve(normalize(trimmed));
  return resolve(resolveLibraryContentDir(getUploadBaseDir(), libraryPath), normalize(trimmed));
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

const buildFallbackDbUpdate = (book: Book, mergedMeta: Record<string, unknown>, newCoverPath: string | null, nextTitle: string | null) => {
  const data: { coverImagePath?: string; title?: string; metadata: string } = {
    metadata: JSON.stringify(mergedMeta),
  };
  if (newCoverPath) data.coverImagePath = newCoverPath;
  if (nextTitle && nextTitle !== book.title) data.title = nextTitle;
  const metaChanged = data.metadata !== (book.metadata ?? "");
  const coverChanged = Boolean(newCoverPath);
  const titleChanged = Boolean(nextTitle && nextTitle !== book.title);
  return { hasChanges: metaChanged || coverChanged || titleChanged, data };
};

const mergeLocalFallbackIntoMetadata = (
  meta: Record<string, unknown> | null,
  slug: string,
  inferred: FilenameInference,
  nextAuthor: string | null,
  newCoverPath: string | null,
  pdfTextGuess: PdfPlainTextGuess,
): Record<string, unknown> => {
  const prevLf = meta?.localFallback && typeof meta.localFallback === "object" ? meta.localFallback : {};
  const now = new Date().toISOString();
  const pdfTxt =
    pdfTextGuess.title || pdfTextGuess.author
      ? {
          ...(pdfTextGuess.title ? { title: pdfTextGuess.title } : {}),
          ...(pdfTextGuess.author ? { author: pdfTextGuess.author } : {}),
        }
      : null;
  return {
    ...(meta ?? {}),
    ...(nextAuthor ? { author: nextAuthor } : {}),
    localFallback: {
      ...(prevLf as object),
      appliedAt: now,
      filenameSlug: slug,
      inferredTitle: inferred.suggestedTitle,
      inferredAuthor: inferred.suggestedAuthor,
      ...(pdfTxt ? { pdfFirstPageText: pdfTxt } : {}),
      ...(newCoverPath ? { coverFromFirstPage: true, coverGeneratedAt: now } : {}),
    },
  };
};

const pickFallbackAuthor = (
  meta: Record<string, unknown> | null,
  pdfEmb: PdfEmbeddedMeta,
  pdfText: PdfPlainTextGuess,
  inferred: FilenameInference,
): string | null => {
  const hasAuthor = typeof meta?.author === "string" && meta.author.trim().length > 0;
  if (hasAuthor) return null;
  const a = pdfEmb.author?.trim() || pdfText.author?.trim() || inferred.suggestedAuthor?.trim();
  return a || null;
};

const pickRepairedTitle = (
  repairTitle: boolean,
  pdfEmb: PdfEmbeddedMeta,
  pdfText: PdfPlainTextGuess,
  inferred: FilenameInference,
): string | null => {
  if (!repairTitle) return null;
  const fromPdf = pdfEmb.title?.trim();
  if (fromPdf) return fromPdf;
  const fromPageText = pdfText.title?.trim();
  if (fromPageText) return fromPageText;
  return inferred.suggestedTitle ?? null;
};

type BookWithLibraryPath = Book & { library: { path: string } };

const maybeGenerateDerivedCover = async (book: BookWithLibraryPath, meta: Record<string, unknown> | null, bookId: number, absFilePath: string, ext: string): Promise<string | null> => {
  beLog("maybeGenerateDerivedCover", { bookId });
  if (!shouldGenerateCoverFromLocalFile(book, meta)) return null;
  const coverDir = resolveLibraryCoverCacheDir(book.library.path);
  mkdirSync(coverDir, { recursive: true });
  const outCover = libraryDerivedCoverAbsolutePath(book.library.path, bookId);
  const ok = await tryGenerateCoverWebp(absFilePath, ext, outCover);
  return ok ? outCover : null;
};

const shouldGenerateCoverFromLocalFile = (book: Book, meta: Record<string, unknown> | null) => {
  const ol = meta?.openLibrary && typeof meta.openLibrary === "object" ? (meta.openLibrary as Record<string, unknown>) : null;
  const fetchFailed = Boolean(ol?.fetchFailed);
  const hasRemoteCover = typeof meta?.coverUrl === "string" && String(meta.coverUrl).trim().length > 0;
  const storedCover = typeof book.coverImagePath === "string" ? book.coverImagePath.trim() : "";
  const localCoverFileOk = storedCover.length > 0 && existsSync(storedCover);
  return !localCoverFileOk && (!hasRemoteCover || fetchFailed);
};

const libraryDerivedCoverAbsolutePath = (libraryPath: string | null | undefined, bookId: number) =>
  join(resolveLibraryCoverCacheDir(libraryPath), `${DERIVED_COVER_PREFIX}${bookId}.webp`);

const loadPdfEmbeddedMetadataIfPdf = async (ext: string, absFilePath: string, fileSize: number): Promise<PdfEmbeddedMeta> => {
  if (ext === PDF_EXT) return extractPdfEmbeddedMetadata(absFilePath, fileSize);
  return { title: null, author: null };
};

const buildFilenameInference = (absFilePath: string, bookTitle: string) => {
  const slug = stripUploadTimestamp(absFilePath);
  const inferred = inferFromFilenameSlug(slug);
  const repairTitle = titleLooksLikeRawFilename(bookTitle, slug);
  return { slug, inferred, repairTitle };
};

const tryStatFileSize = (absFilePath: string): number | null => {
  try {
    return statSync(absFilePath).size;
  } catch (e) {
    beLogErr("tryStatFileSize", e, { path: absFilePath.slice(0, 120) });
    return null;
  }
};

const parseMeta = (raw: string | null | undefined): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? (o as Record<string, unknown>) : null;
  } catch (e) {
    beLogErr("parseMeta_bookLocalFallback", e);
    return null;
  }
};
