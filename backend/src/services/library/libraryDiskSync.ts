import type { Book, PrismaClient } from "@prisma/client";
import { existsSync, realpathSync, statSync } from "fs";
import { readdir } from "fs/promises";
import { basename, extname, join, normalize, relative, resolve } from "path";
import { beLog, beLogErr } from "../../utils/beLog";
import { inferFromFilenameSlug, stripUploadTimestamp } from "../book/bookFilenameInference";
import { inferAndPersistPdfMarginStripRegexes } from "../pdf/bookPdfMarginStripPersist";
import { applyLocalBookFallback } from "../book/bookLocalFallback";
import { getUploadBaseDir, resolveLibraryContentDir } from "./libraryPathResolve";
import { enqueuePdfToEpubForBook } from "../epub/pdfToEpubQueue";

const ALLOWED_EXT = new Set([".pdf", ".epub"]);
const MAX_TITLE_LEN = 500;

const syncLocks = new Map<number, Promise<Book[]>>();

export const syncLibraryBooksFromDisk = async (db: PrismaClient, libraryId: number): Promise<Book[]> => {
  beLog("syncLibraryBooksFromDisk", { libraryId });
  const running = syncLocks.get(libraryId);
  if (running) return running;
  const p = runSyncLibraryBooksFromDisk(db, libraryId).finally(() => {
    if (syncLocks.get(libraryId) === p) syncLocks.delete(libraryId);
  });
  syncLocks.set(libraryId, p);
  return p;
};

const runSyncLibraryBooksFromDisk = async (db: PrismaClient, libraryId: number): Promise<Book[]> => {
  const lib = await db.library.findUnique({ where: { id: libraryId } });
  if (!lib) throw new Error("Library not found");
  const pathConfigured = lib.path?.trim() ?? "";
  if (!pathConfigured) throw new Error("Library has no path configured");
  const rootReal = resolveScannedRootRealPath(lib.path);
  const diskFiles = await collectReadableBookPathsUnder(rootReal);
  const seenKeys = await loadExistingCanonicalKeys(db, libraryId);
  return importNewBooksFromPaths(db, libraryId, diskFiles, rootReal, seenKeys);
};

const importNewBooksFromPaths = async (
  db: PrismaClient,
  libraryId: number,
  diskFiles: string[],
  rootReal: string,
  seenKeys: Set<string>
): Promise<Book[]> => {
  beLog("importNewBooksFromPaths", { libraryId, files: diskFiles.length });
  const added: Book[] = [];
  for (const absPath of diskFiles) {
    const book = await tryCreateBookFromDiskFile(db, libraryId, absPath, rootReal, seenKeys);
    if (book) {
      added.push(book);
      void enqueuePdfToEpubForBook(db, book.id);
    }
  }
  return added;
};

const tryCreateBookFromDiskFile = async (
  db: PrismaClient,
  libraryId: number,
  absPath: string,
  rootReal: string,
  seenKeys: Set<string>
): Promise<Book | null> => {
  beLog("tryCreateBookFromDiskFile", { libraryId });
  const key = canonicalPathKey(absPath);
  if (seenKeys.has(key)) return null;
  if (!isStrictDescendantFile(rootReal, absPath)) return null;
  const { title, metadata } = buildTitleAndMetadataForDiskFile(absPath);
  let row: Book | null = null;
  try {
    row = await db.book.create({
      data: { libraryId, title, filePath: absPath, metadata },
    });
  } catch (e: any) {
    if (typeof e?.code === "string" && e.code === "P2002") return null;
    throw e;
  }
  seenKeys.add(key);
  await runApplyLocalFallbackQuietly(db, row.id);
  await runInferPdfMarginsQuietly(db, row.id);
  const refreshed = await db.book.findUnique({ where: { id: row.id } });
  return refreshed ?? row;
};

const loadExistingCanonicalKeys = async (db: PrismaClient, libraryId: number): Promise<Set<string>> => {
  beLog("loadExistingCanonicalKeys", { libraryId });
  const existing = await db.book.findMany({
    where: { libraryId },
    select: { filePath: true },
  });
  return new Set(existing.map((b) => canonicalPathKey(b.filePath)));
};

const collectReadableBookPathsUnder = async (dir: string): Promise<string[]> => {
  const out: string[] = [];
  await appendBookFilesFromDirectoryWalk(dir, out);
  return out;
};

const appendBookFilesFromDirectoryWalk = async (current: string, out: string[]): Promise<void> => {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (e) {
    beLogErr("appendBookFilesFromDirectoryWalk", e, { current: current.slice(0, 120) });
    return;
  }
  for (const ent of entries) {
    const full = join(current, ent.name);
    if (ent.isDirectory()) {
      await appendBookFilesFromDirectoryWalk(full, out);
      continue;
    }
    if (!ent.isFile()) continue;
    if (!isAllowedBookExtension(ent.name)) continue;
    if (!isReadableFile(full)) continue;
    out.push(full);
  }
};

const resolveScannedRootRealPath = (configuredPath: string | null): string => {
  beLog("resolveScannedRootRealPath");
  const rootResolved = resolveLibraryContentDir(getUploadBaseDir(), configuredPath);
  if (!existsSync(rootResolved)) throw new Error(`Library path does not exist: ${rootResolved}`);
  let rootReal: string;
  try {
    rootReal = statSync(rootResolved).isDirectory() ? realpathSync.native(resolve(normalize(rootResolved))) : "";
  } catch (e) {
    beLogErr("resolveScannedRootRealPath_stat", e, { rootResolved: rootResolved.slice(0, 120) });
    throw new Error(`Library path is not accessible: ${rootResolved}`);
  }
  if (!rootReal) throw new Error(`Library path is not a directory: ${rootResolved}`);
  return rootReal;
};

const buildTitleAndMetadataForDiskFile = (absPath: string) => {
  const ext = extname(absPath).toLowerCase();
  const inferred = inferFromFilenameSlug(stripUploadTimestamp(absPath));
  const baseTitle = basename(absPath, ext);
  const title = (inferred.suggestedTitle?.trim() || baseTitle).slice(0, MAX_TITLE_LEN);
  return { title, metadata: metadataJsonForExtension(ext) };
};

const metadataJsonForExtension = (ext: string) => {
  if (!ALLOWED_EXT.has(ext)) return null;
  return JSON.stringify({ fileExt: ext.slice(1) });
};

const isStrictDescendantFile = (rootReal: string, absPath: string) => {
  const resolvedFile = resolve(normalize(absPath));
  const relFromRoot = relative(rootReal, resolvedFile);
  if (relFromRoot.startsWith("..") || relFromRoot === "") return false;
  return true;
};

const runApplyLocalFallbackQuietly = (db: PrismaClient, bookId: number) =>
  applyLocalBookFallback(db, bookId).catch((e) => {
    beLogErr("runApplyLocalFallbackQuietly", e, { bookId });
    return undefined;
  });

const runInferPdfMarginsQuietly = async (db: PrismaClient, bookId: number) => {
  try {
    await inferAndPersistPdfMarginStripRegexes(db, bookId);
  } catch (e) {
    beLogErr("runInferPdfMarginsQuietly", e, { bookId });
  }
};

const isReadableFile = (fullPath: string) => {
  try {
    statSync(fullPath);
    return true;
  } catch {
    return false;
  }
};

const isAllowedBookExtension = (fileName: string) => ALLOWED_EXT.has(extname(fileName).toLowerCase());

const canonicalPathKey = (p: string) => {
  const expanded = resolve(normalize(p.trim()));
  if (!existsSync(expanded)) return caseFoldPathForKey(expanded);
  try {
    return caseFoldPathForKey(realpathSync.native(expanded));
  } catch (e) {
    beLogErr("canonicalPathKey_realpath", e);
    return caseFoldPathForKey(expanded);
  }
};

const caseFoldPathForKey = (pathStr: string) => {
  if (process.platform === "win32") return pathStr.toLowerCase();
  return pathStr;
};
