import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { resolveBookFileOnDisk } from "./bookLocalFallback";
import { getCoverCacheDir } from "./coverOptimization";
import { getUploadBaseDir, resolveLibraryCoverCacheDir } from "./libraryPathResolve";
import { beLog, beLogErr } from "../utils/beLog";

const DERIVED_COVER_PREFIX = "derived-cover-";

export type BookDiskArtifactRow = {
  id: number;
  filePath: string;
  coverImagePath: string | null;
  library: { path: string };
};

const safeUnlink = (absPath: string | null | undefined) => {
  const p = typeof absPath === "string" ? absPath.trim() : "";
  if (!p) return;
  try {
    if (!existsSync(p)) return;
    unlinkSync(p);
  } catch (e) {
    beLogErr("safeUnlink", e, { path: p.slice(0, 200) });
  }
};

export const unlinkBookMainAndCacheArtifacts = (book: BookDiskArtifactRow) => {
  beLog("unlinkBookMainAndCacheArtifacts", { bookId: book.id });
  const mainPath = resolveBookFileOnDisk(book.library.path, book.filePath);
  safeUnlink(mainPath);
  safeUnlink(book.coverImagePath);
  safeUnlink(join(resolveLibraryCoverCacheDir(book.library.path), `${DERIVED_COVER_PREFIX}${book.id}.webp`));
  safeUnlink(join(getCoverCacheDir(getUploadBaseDir()), `book-${book.id}.webp`));
};
