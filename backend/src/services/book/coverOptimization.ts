import type { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import { createReadStream, existsSync, mkdirSync, statSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import { beLog, beLogErr } from "../../utils/beLog";
import { persistBookDerivedCoverIfPossible } from "./bookLocalFallback";
import { fetchOpenLibraryCoverResponse } from "../openLibrary/openLibraryClient";

export const COVER_WIDTH_STEPS = [128, 192, 256, 384, 560] as const;
const DEFAULT_COVER_WIDTH = 560;
const WEBP_QUALITY = 86;
const WEBP_EFFORT = 4;

const isAllowedCoverWidth = (n: number): n is (typeof COVER_WIDTH_STEPS)[number] =>
  (COVER_WIDTH_STEPS as readonly number[]).includes(n);

export const parseCoverWidthQuery = (req: Request): number => {
  const raw = req.query.w ?? req.query.width;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = typeof s === "string" ? parseInt(s, 10) : NaN;
  if (Number.isFinite(n) && isAllowedCoverWidth(n)) return n;
  return DEFAULT_COVER_WIDTH;
};

const RASTER_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".tiff", ".tif", ".avif"]);

export type OpenLibraryCoverRouteFallback = {
  prisma: PrismaClient;
  bookId: number;
};

const writeOlSourceMasterWebp = async (buf: Buffer, cacheDir: string, olCoverId: number) => {
  const masterPath = join(cacheDir, `ol-${olCoverId}-src.webp`);
  await sharp(buf)
    .rotate()
    .resize({ width: DEFAULT_COVER_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
    .toFile(masterPath);
};

export const serveOptimizedOpenLibraryCover = async (
  res: Response,
  olCoverId: number,
  cacheDir: string,
  fallback: OpenLibraryCoverRouteFallback | undefined,
  targetWidth: number
) => {
  beLog("serveOptimizedOpenLibraryCover", { olCoverId, targetWidth });
  mkdirSync(cacheDir, { recursive: true });
  const cachePath = join(cacheDir, `ol-${olCoverId}-w${targetWidth}.webp`);
  const masterPath = join(cacheDir, `ol-${olCoverId}-src.webp`);
  const maxAgeRemote = 1000 * 60 * 60 * 24 * 30;

  try {
    let needFetch = !existsSync(masterPath);
    if (!needFetch) {
      const cStat = statSync(masterPath);
      needFetch = Date.now() - cStat.mtimeMs > maxAgeRemote;
    }
    if (needFetch) {
      const r = await fetchOpenLibraryCoverResponse(olCoverId);
      if (!r.ok) {
        if (fallback && (await tryServeDerivedCoverAfterOlFailure(res, fallback, cacheDir, targetWidth))) return;
        res.status(r.status === 404 ? 404 : 502).json({ error: "Cover source unavailable" });
        return;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      await writeOlSourceMasterWebp(buf, cacheDir, olCoverId);
    }
    let needResize = !existsSync(cachePath);
    if (!needResize && existsSync(masterPath)) {
      const cStat = statSync(cachePath);
      const mStat = statSync(masterPath);
      needResize = cStat.mtimeMs < mStat.mtimeMs;
    }
    if (needResize)
      await sharp(masterPath)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
        .toFile(cachePath);
    streamRawImage(res, cachePath, "image/webp");
  } catch (e) {
    beLogErr("serveOptimizedOpenLibraryCover", e, { olCoverId });
    if (fallback && (await tryServeDerivedCoverAfterOlFailure(res, fallback, cacheDir, targetWidth))) return;
    res.status(502).json({ error: "Could not optimize cover" });
  }
};

export const serveOptimizedLocalCover = async (
  res: Response,
  srcPath: string,
  cacheBaseName: string,
  cacheDir: string,
  targetWidth: number
) => {
  beLog("serveOptimizedLocalCover", { cacheBaseName, targetWidth });
  const lower = srcPath.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot >= 0 ? lower.slice(dot) : "";
  if (!RASTER_EXT.has(ext)) {
    res.status(415).json({ error: "Unsupported cover format" });
    return;
  }

  mkdirSync(cacheDir, { recursive: true });
  const cachePath = join(cacheDir, `${cacheBaseName}-w${targetWidth}.webp`);

  try {
    const srcStat = statSync(srcPath);
    let stale = true;
    if (existsSync(cachePath)) {
      const cStat = statSync(cachePath);
      stale = cStat.mtimeMs < srcStat.mtimeMs;
    }
    if (stale) {
      await sharp(srcPath)
        .rotate()
        .resize({ width: targetWidth, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
        .toFile(cachePath);
    }
    streamRawImage(res, cachePath, "image/webp");
  } catch (e) {
    beLogErr("serveOptimizedLocalCover", e, { cacheBaseName });
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
    streamRawImage(res, srcPath, mime);
  }
};

export const getCoverCacheDir = (uploadDir: string) => join(uploadDir, ".cover-cache");

export const streamRawImage = (res: Response, filePath: string, contentType: string) => {
  res.setHeader("Content-Type", contentType);
  if (res.getHeader("Cache-Control") == null) res.setHeader("Cache-Control", "public, max-age=86400");
  createReadStream(filePath).pipe(res);
};

const tryServeDerivedCoverAfterOlFailure = async (
  res: Response,
  fb: OpenLibraryCoverRouteFallback,
  cacheDir: string,
  targetWidth: number
) => {
  beLog("tryServeDerivedCoverAfterOlFailure", { bookId: fb.bookId });
  const localPath = await persistBookDerivedCoverIfPossible(fb.prisma, fb.bookId);
  if (!localPath) return false;
  await serveOptimizedLocalCover(res, localPath, `book-${fb.bookId}`, cacheDir, targetWidth);
  return true;
};
