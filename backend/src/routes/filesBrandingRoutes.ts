import { createReadStream, existsSync, unlinkSync } from "fs";
import { extname, join, relative } from "path";
import { Router, Request, Response } from "express";
import { prisma } from "../graphql/resolverParts/prisma";
import { beLog } from "../utils/beLog";
import { MIME_TYPES, UPLOAD_DIR } from "./filesConstants";
import { faviconUpload, libraryBannerBrandingUpload } from "./filesMulter";
import { requireAdmin } from "./filesAuth";

const streamLocalImage = (res: Response, abs: string, cacheControl: string) => {
  if (!existsSync(abs)) {
    res.status(404).end();
    return;
  }
  const ext = extname(abs).toLowerCase();
  res.setHeader("Content-Type", MIME_TYPES[ext] ?? "application/octet-stream");
  res.setHeader("Cache-Control", cacheControl);
  createReadStream(abs).pipe(res);
};

const handleGetFavicon = async (_req: Request, res: Response) => {
  beLog("route_get_branding_favicon");
  const row = await prisma.appCustomization.findUnique({ where: { id: 1 } });
  if (!row?.faviconRelPath) {
    res.status(404).end();
    return;
  }
  streamLocalImage(res, join(UPLOAD_DIR, row.faviconRelPath), "public, max-age=3600");
};

const handlePostFavicon = async (req: Request, res: Response) => {
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
};

const handlePostLibraryBanner = async (req: Request, res: Response) => {
  beLog("route_post_branding_library_banner");
  if ((await requireAdmin(req, res)) == null) return;
  if (!req.file) {
    res.status(400).json({ error: "No file received" });
    return;
  }
  const relPath = relative(UPLOAD_DIR, req.file.path).replace(/\\/g, "/");
  const row = await prisma.customLibraryBanner.create({ data: { relPath } });
  res.json({ id: row.id, url: `/api/files/branding/library-banner/${row.id}` });
};

const handleGetLibraryBanner = async (req: Request, res: Response) => {
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
  streamLocalImage(res, join(UPLOAD_DIR, row.relPath), "private, max-age=86400");
};

const handleDeleteLibraryBanner = async (req: Request, res: Response) => {
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
};

export const registerBrandingRoutes = (router: Router) => {
  router.get("/branding/favicon", handleGetFavicon);
  router.post("/branding/favicon", faviconUpload.single("file"), handlePostFavicon);
  router.post("/branding/library-banner", libraryBannerBrandingUpload.single("file"), handlePostLibraryBanner);
  router.get("/branding/library-banner/:id", handleGetLibraryBanner);
  router.delete("/branding/library-banner/:id", handleDeleteLibraryBanner);
};
