import { getAuthUserForRequest } from "../auth/getAuthUserForRequest";
import { createHash } from "node:crypto";
import { Router, Request, Response } from "express";
import { createReadStream, existsSync, renameSync, statSync, unlinkSync } from "fs";
import { extname, join, relative } from "path";
import { prisma } from "../graphql/resolverParts/prisma";
import { resolveBookFileOnDisk } from "../services/bookLocalFallback";
import { resolveLibraryContentDir } from "../services/libraryPathResolve";
import { tryGenerateCoverWebp } from "../services/bookCoverFromFile";
import { parseCoverWidthQuery, serveOptimizedLocalCover, serveOptimizedOpenLibraryCover } from "../services/coverOptimization";
import { extractPdfEmbeddedMetadata } from "../services/pdfEmbeddedMetadata";
import { writeSrvLog } from "../utils/accessLog";
import { beLog, beLogErr } from "../utils/beLog";
import { AVATAR_DIR, COVER_CACHE_DIR, MIME_TYPES, UPLOAD_DIR } from "./filesConstants";
import { avatarUpload, faviconUpload, libraryBannerBrandingUpload, upload } from "./filesMulter";
import { resolveUploadDestination } from "./filesMiddleware";
import { streamBookWithRange } from "./filesStreamBook";

const router = Router();

const getAuthHeaderOrQueryToken = (req: Request) => {
  const fromHeader = req.headers.authorization;
  if (typeof fromHeader === "string" && fromHeader.trim()) return fromHeader;
  const q = req.query.token;
  const raw = typeof q === "string" ? q.trim() : "";
  if (!raw) return undefined;
  return `Bearer ${raw}`;
};

const requireUser = async (req: Request, res: Response) => {
  const u = await getAuthUserForRequest(prisma, req.headers.authorization);
  if (u == null) {
    res.status(401).json({ error: "Unauthenticated" });
    return null;
  }
  return u;
};

const requireUserForCover = async (req: Request, res: Response) => {
  const u = await getAuthUserForRequest(prisma, getAuthHeaderOrQueryToken(req));
  if (u == null) {
    res.status(401).json({ error: "Unauthenticated" });
    return null;
  }
  return u;
};

const requireAdmin = async (req: Request, res: Response) => {
  const u = await getAuthUserForRequest(prisma, req.headers.authorization);
  if (u == null) {
    res.status(401).json({ error: "Unauthenticated" });
    return null;
  }
  if (!u.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return u;
};

const PDF_EMBEDDED_META_SYNC_MAX_BYTES = 6 * 1024 * 1024;

const schedulePdfEmbeddedMetaExtraction = (absPath: string, size: number) =>
  setTimeout(async () => {
    try {
      const embedded = await extractPdfEmbeddedMetadata(absPath, size);
      beLog("pdf_embedded_meta_async", { hasTitle: Boolean(embedded.title), hasAuthor: Boolean(embedded.author) });
    } catch (e) {
      beLogErr("pdf_embedded_meta_async", e);
    }
  }, 0);

router.post("/upload", resolveUploadDestination, upload.single("file"), async (req: Request, res: Response) => {
  beLog("route_post_upload");
  if ((await requireUser(req, res)) == null) return;
  if (!req.file) {
    res.status(400).json({ error: "No file received" });
    return;
  }
  const ext = extname(req.file.originalname).toLowerCase();
  let embeddedTitle: string | null = null;
  let embeddedAuthor: string | null = null;
  if (ext === ".pdf") {
    if (req.file.size <= PDF_EMBEDDED_META_SYNC_MAX_BYTES) {
      const embedded = await extractPdfEmbeddedMetadata(req.file.path, req.file.size);
      embeddedTitle = embedded.title;
      embeddedAuthor = embedded.author;
      beLog("route_post_upload_pdf_meta", { mode: "sync", hasTitle: Boolean(embeddedTitle), hasAuthor: Boolean(embeddedAuthor) });
    } else {
      beLog("route_post_upload_pdf_meta", { mode: "async", size: req.file.size });
      schedulePdfEmbeddedMetaExtraction(req.file.path, req.file.size);
    }
  }
  res.json({
    path: req.file.path,
    filename: req.file.originalname,
    size: req.file.size,
    ...(ext === ".pdf" ? { embeddedTitle, embeddedAuthor } : {}),
  });
});

router.get("/upload-preview", async (req: Request, res: Response) => {
  beLog("route_get_upload_preview");
  const u = await requireUserForCover(req, res);
  if (u == null) return;
  const rawLibId = req.query.libraryId;
  const libId = typeof rawLibId === "string" ? parseInt(rawLibId, 10) : NaN;
  if (!Number.isFinite(libId) || libId < 1) {
    res.status(400).json({ error: "Invalid libraryId" });
    return;
  }
  const lib = await prisma.library.findFirst({ where: { id: libId, userId: u.id } });
  if (!lib) {
    res.status(404).json({ error: "Library not found" });
    return;
  }
  const rawPath = req.query.path;
  const abs = typeof rawPath === "string" ? rawPath.trim() : "";
  if (!abs) {
    res.status(400).json({ error: "path is required" });
    return;
  }
  const allowedRoot = resolveLibraryContentDir(UPLOAD_DIR, lib.path);
  if (!abs.startsWith(allowedRoot)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!existsSync(abs)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const ext = extname(abs).toLowerCase();
  if (ext !== ".pdf" && ext !== ".epub") {
    res.status(415).json({ error: "Unsupported format" });
    return;
  }
  const st = statSync(abs);
  const key = createHash("sha1").update(`${abs}:${st.mtimeMs}`).digest("hex").slice(0, 16);
  const masterPath = join(COVER_CACHE_DIR, `upload-preview-${key}-src.webp`);
  if (!existsSync(masterPath)) {
    const ok = await tryGenerateCoverWebp(abs, ext, masterPath);
    if (!ok) {
      res.status(502).json({ error: "Failed to generate preview" });
      return;
    }
  }
  res.setHeader("Cache-Control", "private, max-age=300");
  await serveOptimizedLocalCover(res, masterPath, `upload-preview-${key}`, COVER_CACHE_DIR, parseCoverWidthQuery(req));
});

router.get("/covers/:bookId", async (req: Request, res: Response) => {
  beLog("route_get_cover_book");
  const u = await requireUserForCover(req, res);
  if (u == null) return;
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }
  const book = await prisma.book.findFirst({
    where: { id: bookId, library: { userId: u.id } },
  });
  if (!book?.coverImagePath) {
    res.status(404).json({ error: "Cover not found" });
    return;
  }
  res.setHeader("Cache-Control", "private, max-age=86400");
  await serveOptimizedLocalCover(res, book.coverImagePath, `book-${bookId}`, COVER_CACHE_DIR, parseCoverWidthQuery(req));
});

router.get("/avatar/me", async (req: Request, res: Response) => {
  beLog("route_get_avatar_me");
  const u = await requireUser(req, res);
  if (u == null) return;
  if (!u.avatarRelPath) {
    res.status(404).end();
    return;
  }
  const abs = join(UPLOAD_DIR, u.avatarRelPath);
  if (!existsSync(abs)) {
    res.status(404).end();
    return;
  }
  const ext = extname(abs).toLowerCase();
  res.setHeader("Content-Type", MIME_TYPES[ext] ?? "application/octet-stream");
  res.setHeader("Cache-Control", "private, no-cache");
  createReadStream(abs).pipe(res);
});

router.post("/avatar", avatarUpload.single("file"), async (req: Request, res: Response) => {
  beLog("route_post_avatar");
  const u = await requireUser(req, res);
  if (u == null) return;
  if (!req.file) {
    res.status(400).json({ error: "No file received" });
    return;
  }
  const ext = extname(req.file.originalname).toLowerCase() || ".jpg";
  if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    res.status(400).json({ error: "Invalid image type" });
    return;
  }
  const finalName = `user-${u.id}${ext}`;
  const finalAbs = join(AVATAR_DIR, finalName);
  const prev = await prisma.user.findUnique({ where: { id: u.id }, select: { avatarRelPath: true } });
  if (prev?.avatarRelPath) {
    const oldAbs = join(UPLOAD_DIR, prev.avatarRelPath);
    if (oldAbs !== finalAbs && existsSync(oldAbs))
      try {
        unlinkSync(oldAbs);
      } catch {
        /* best-effort */
      }
  }
  if (existsSync(finalAbs) && finalAbs !== req.file.path)
    try {
      unlinkSync(finalAbs);
    } catch {
      /* best-effort */
    }
  try {
    renameSync(req.file.path, finalAbs);
  } catch (e) {
    beLog("route_post_avatar_rename_fail", { err: String(e) });
    res.status(500).json({ error: "Failed to store avatar" });
    return;
  }
  const relPath = relative(UPLOAD_DIR, finalAbs).replace(/\\/g, "/");
  await prisma.user.update({ where: { id: u.id }, data: { avatarRelPath: relPath } });
  res.json({ ok: true, hasAvatar: true });
});

router.delete("/avatar", async (req: Request, res: Response) => {
  beLog("route_delete_avatar");
  const u = await requireUser(req, res);
  if (u == null) return;
  const row = await prisma.user.findUnique({ where: { id: u.id }, select: { avatarRelPath: true } });
  if (row?.avatarRelPath) {
    const oldAbs = join(UPLOAD_DIR, row.avatarRelPath);
    await prisma.user.update({ where: { id: u.id }, data: { avatarRelPath: null } });
    if (existsSync(oldAbs))
      try {
        unlinkSync(oldAbs);
      } catch {
        /* best-effort */
      }
  }
  res.status(204).end();
});

router.get("/ol-covers/:olId", async (req: Request, res: Response) => {
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
});

router.get("/books/:bookId", async (req: Request, res: Response) => {
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
  writeSrvLog({
    event: "book_file_load",
    ok: fileFound,
    reason: fileFound ? "resolved_path_exists" : "resolved_path_missing",
    bookId,
    libraryId: book.libraryId,
    libraryPath: book.library.path,
    uploadDir: UPLOAD_DIR,
    storedFilePath: book.filePath,
    resolvedAbsolutePath: resolvedPath,
  });
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
});

router.post("/covers/:bookId", async (req: Request, res: Response) => {
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
  const book = await prisma.book.update({
    where: { id: bookId },
    data: { coverImagePath },
  });
  res.json({ id: book.id, coverImagePath: book.coverImagePath });
});

router.get("/branding/favicon", async (_req: Request, res: Response) => {
  beLog("route_get_branding_favicon");
  const row = await prisma.appCustomization.findUnique({ where: { id: 1 } });
  if (!row?.faviconRelPath) {
    res.status(404).end();
    return;
  }
  const abs = join(UPLOAD_DIR, row.faviconRelPath);
  if (!existsSync(abs)) {
    res.status(404).end();
    return;
  }
  const ext = extname(abs).toLowerCase();
  res.setHeader("Content-Type", MIME_TYPES[ext] ?? "application/octet-stream");
  res.setHeader("Cache-Control", "public, max-age=3600");
  createReadStream(abs).pipe(res);
});

router.post("/branding/favicon", faviconUpload.single("file"), async (req: Request, res: Response) => {
  beLog("route_post_branding_favicon");
  if ((await requireAdmin(req, res)) == null) return;
  if (!req.file) {
    res.status(400).json({ error: "No file received" });
    return;
  }
  const relPath = relative(UPLOAD_DIR, req.file.path).replace(/\\/g, "/");
  await prisma.appCustomization.upsert({
    where: { id: 1 },
    create: { id: 1, faviconRelPath: relPath },
    update: { faviconRelPath: relPath },
  });
  const row = await prisma.appCustomization.findUnique({ where: { id: 1 } });
  res.json({ url: `/api/files/branding/favicon?v=${encodeURIComponent(row?.updatedAt.toISOString() ?? String(Date.now()))}` });
});

router.post("/branding/library-banner", libraryBannerBrandingUpload.single("file"), async (req: Request, res: Response) => {
  beLog("route_post_branding_library_banner");
  if ((await requireAdmin(req, res)) == null) return;
  if (!req.file) {
    res.status(400).json({ error: "No file received" });
    return;
  }
  const relPath = relative(UPLOAD_DIR, req.file.path).replace(/\\/g, "/");
  const row = await prisma.customLibraryBanner.create({ data: { relPath } });
  res.json({ id: row.id, url: `/api/files/branding/library-banner/${row.id}` });
});

router.get("/branding/library-banner/:id", async (req: Request, res: Response) => {
  beLog("route_get_branding_library_banner");
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const row = await prisma.customLibraryBanner.findUnique({ where: { id } });
  if (!row) {
    res.status(404).end();
    return;
  }
  const abs = join(UPLOAD_DIR, row.relPath);
  if (!existsSync(abs)) {
    res.status(404).end();
    return;
  }
  const ext = extname(abs).toLowerCase();
  res.setHeader("Content-Type", MIME_TYPES[ext] ?? "application/octet-stream");
  res.setHeader("Cache-Control", "private, max-age=86400");
  createReadStream(abs).pipe(res);
});

router.delete("/branding/library-banner/:id", async (req: Request, res: Response) => {
  beLog("route_delete_branding_library_banner");
  if ((await requireAdmin(req, res)) == null) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const row = await prisma.customLibraryBanner.findUnique({ where: { id } });
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const abs = join(UPLOAD_DIR, row.relPath);
  await prisma.customLibraryBanner.delete({ where: { id } });
  try {
    if (existsSync(abs)) unlinkSync(abs);
  } catch {
    /* best-effort */
  }
  res.status(204).end();
});

router.get("/health", (_req, res) => {
  beLog("route_files_health");
  res.json({ status: "ok" });
});

export default router;
