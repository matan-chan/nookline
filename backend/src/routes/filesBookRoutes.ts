import { existsSync } from "fs";
import { Router, Request, Response } from "express";
import { prisma } from "../graphql/resolverParts/prisma";
import { resolveBookFileOnDisk } from "../services/bookLocalFallback";
import { parseCoverWidthQuery, serveOptimizedLocalCover, serveOptimizedOpenLibraryCover } from "../services/coverOptimization";
import { writeSrvLog } from "../utils/accessLog";
import { beLog } from "../utils/beLog";
import { COVER_CACHE_DIR, UPLOAD_DIR } from "./filesConstants";
import { streamBookWithRange } from "./filesStreamBook";
import { requireUser, requireUserForCover } from "./filesAuth";

const handleGetBookCover = async (req: Request, res: Response) => {
  beLog("route_get_cover_book");
  const u = await requireUserForCover(req, res);
  if (u == null) return;
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }
  const book = await prisma.book.findFirst({ where: { id: bookId, library: { userId: u.id } } });
  if (!book?.coverImagePath) {
    res.status(404).json({ error: "Cover not found" });
    return;
  }
  res.setHeader("Cache-Control", "private, max-age=86400");
  await serveOptimizedLocalCover(res, book.coverImagePath, `book-${bookId}`, COVER_CACHE_DIR, parseCoverWidthQuery(req));
};

const handleGetOlCover = async (req: Request, res: Response) => {
  beLog("route_get_ol_cover");
  const olId = parseInt(req.params.olId, 10);
  if (Number.isNaN(olId)) {
    res.status(400).json({ error: "Invalid cover id" });
    return;
  }
  const rawBookId = req.query.bookId;
  const bookId = typeof rawBookId === "string" && /^\d+$/.test(rawBookId) ? parseInt(rawBookId, 10) : NaN;
  const fallback = !Number.isNaN(bookId) && bookId > 0 ? { prisma, bookId } : undefined;
  await serveOptimizedOpenLibraryCover(res, olId, COVER_CACHE_DIR, fallback, parseCoverWidthQuery(req));
};

const logBookFileLookup = (bookId: number, libraryId: number, libraryPath: string, storedFilePath: string, resolvedPath: string, fileFound: boolean) =>
  writeSrvLog({
    event: "book_file_load",
    ok: fileFound,
    reason: fileFound ? "resolved_path_exists" : "resolved_path_missing",
    bookId,
    libraryId,
    libraryPath,
    uploadDir: UPLOAD_DIR,
    storedFilePath,
    resolvedAbsolutePath: resolvedPath,
  });

const handleGetBookFile = async (req: Request, res: Response) => {
  beLog("route_get_book_file");
  const u = await requireUser(req, res);
  if (u == null) return;
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }
  const book = await prisma.book.findFirst({ where: { id: bookId, library: { userId: u.id } }, include: { library: true } });
  beLog("route_get_book_file_find_unique", { bookId, book });
  if (!book) {
    writeSrvLog({ event: "book_file_load", ok: false, reason: "book_not_in_db", bookId });
    res.status(404).json({ error: "Book not found" });
    return;
  }
  const resolvedPath = resolveBookFileOnDisk(book.library.path, book.filePath);
  const fileFound = existsSync(resolvedPath);
  logBookFileLookup(bookId, book.libraryId, book.library.path, book.filePath, resolvedPath, fileFound);
  if (fileFound)
    res.once("finish", () => {
      writeSrvLog({
        event: "book_file_response",
        ok: res.statusCode >= 200 && res.statusCode < 400,
        bookId,
        statusCode: res.statusCode,
        resolvedAbsolutePath: resolvedPath,
      });
    });
  streamBookWithRange(req, res, resolvedPath);
};

const handlePostBookCover = async (req: Request, res: Response) => {
  beLog("route_post_cover_book");
  const u = await requireUser(req, res);
  if (u == null) return;
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }
  const pre = await prisma.book.findFirst({ where: { id: bookId, library: { userId: u.id } } });
  if (pre == null) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  const { coverImagePath } = req.body as { coverImagePath: string };
  if (!coverImagePath) {
    res.status(400).json({ error: "coverImagePath is required" });
    return;
  }
  const book = await prisma.book.update({ where: { id: bookId }, data: { coverImagePath } });
  res.json({ id: book.id, coverImagePath: book.coverImagePath });
};

export const registerBookFileRoutes = (router: Router) => {
  router.get("/covers/:bookId", handleGetBookCover);
  router.get("/ol-covers/:olId", handleGetOlCover);
  router.get("/books/:bookId", handleGetBookFile);
  router.post("/covers/:bookId", handlePostBookCover);
};
