import { createHash } from "node:crypto";
import { existsSync, statSync } from "fs";
import { extname, join } from "path";
import { Router, Request, Response } from "express";
import { prisma } from "../../graphql/resolverParts/prisma";
import { resolveLibraryContentDir } from "../../services/library/libraryPathResolve";
import { tryGenerateCoverWebp } from "../../services/book/bookCoverFromFile";
import { parseCoverWidthQuery, serveOptimizedLocalCover } from "../../services/book/coverOptimization";
import { extractPdfEmbeddedMetadata } from "../../services/pdf/pdfEmbeddedMetadata";
import { beLog, beLogErr } from "../../utils/beLog";
import { COVER_CACHE_DIR, UPLOAD_DIR } from "./filesConstants";
import { upload } from "./filesMulter";
import { resolveUploadDestination } from "./filesMiddleware";
import { requireUser, requireUserForCover } from "./filesAuth";

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

const extractPdfMetadataForUpload = async (absPath: string, size: number) => {
  if (size <= PDF_EMBEDDED_META_SYNC_MAX_BYTES) {
    const embedded = await extractPdfEmbeddedMetadata(absPath, size);
    beLog("route_post_upload_pdf_meta", { mode: "sync", hasTitle: Boolean(embedded.title), hasAuthor: Boolean(embedded.author) });
    return { embeddedTitle: embedded.title, embeddedAuthor: embedded.author };
  }
  beLog("route_post_upload_pdf_meta", { mode: "async", size });
  schedulePdfEmbeddedMetaExtraction(absPath, size);
  return { embeddedTitle: null as string | null, embeddedAuthor: null as string | null };
};

const handleUpload = async (req: Request, res: Response) => {
  beLog("route_post_upload");
  if ((await requireUser(req, res)) == null) return;
  if (!req.file) {
    res.status(400).json({ error: "No file received" });
    return;
  }
  const ext = extname(req.file.originalname).toLowerCase();
  const pdfMeta = ext === ".pdf" ? await extractPdfMetadataForUpload(req.file.path, req.file.size) : null;
  res.json({
    path: req.file.path,
    filename: req.file.originalname,
    size: req.file.size,
    ...(pdfMeta ? pdfMeta : {}),
  });
};

const validateUploadPreviewLibrary = async (req: Request, res: Response) => {
  const u = await requireUserForCover(req, res);
  if (u == null) return null;
  const rawLibId = req.query.libraryId;
  const libId = typeof rawLibId === "string" ? parseInt(rawLibId, 10) : NaN;
  if (!Number.isFinite(libId) || libId < 1) {
    res.status(400).json({ error: "Invalid libraryId" });
    return null;
  }
  const lib = await prisma.library.findFirst({ where: { id: libId, userId: u.id } });
  if (!lib) {
    res.status(404).json({ error: "Library not found" });
    return null;
  }
  return lib;
};

const validateUploadPreviewPath = (req: Request, res: Response, libPath: string) => {
  const rawPath = req.query.path;
  const abs = typeof rawPath === "string" ? rawPath.trim() : "";
  if (!abs) {
    res.status(400).json({ error: "path is required" });
    return null;
  }
  const allowedRoot = resolveLibraryContentDir(UPLOAD_DIR, libPath);
  if (!abs.startsWith(allowedRoot)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  if (!existsSync(abs)) {
    res.status(404).json({ error: "File not found" });
    return null;
  }
  const ext = extname(abs).toLowerCase();
  if (ext !== ".pdf" && ext !== ".epub") {
    res.status(415).json({ error: "Unsupported format" });
    return null;
  }
  return { abs, ext };
};

const handleUploadPreview = async (req: Request, res: Response) => {
  beLog("route_get_upload_preview");
  const lib = await validateUploadPreviewLibrary(req, res);
  if (!lib) return;
  const target = validateUploadPreviewPath(req, res, lib.path);
  if (!target) return;
  const { abs, ext } = target;
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
};

export const registerUploadRoutes = (router: Router) => {
  router.post("/upload", resolveUploadDestination, upload.single("file"), handleUpload);
  router.get("/upload-preview", handleUploadPreview);
};
