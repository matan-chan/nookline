import { createReadStream, existsSync, statSync } from "fs";
import { extname } from "path";
import { Request, Response } from "express";
import { beLog } from "../utils/beLog";
import { MIME_TYPES } from "./filesConstants";

export const parseSingleByteRange = (rangeHeader: string, fileSize: number): { start: number; end: number } | null => {
  const raw = rangeHeader.trim();
  if (!raw.toLowerCase().startsWith("bytes=")) return null;
  const first = raw.slice(6).split(",")[0].trim();
  const suffix = /^-(\d+)$/.exec(first);
  if (suffix) {
    const len = parseInt(suffix[1], 10);
    if (!Number.isFinite(len) || len <= 0) return null;
    const start = Math.max(0, fileSize - len);
    return { start, end: fileSize - 1 };
  }
  const m = /^(\d*)-(\d*)$/.exec(first);
  if (!m) return null;
  let start = m[1] ? parseInt(m[1], 10) : 0;
  let end = m[2] ? parseInt(m[2], 10) : fileSize - 1;
  if (Number.isNaN(start)) start = 0;
  if (Number.isNaN(end)) end = fileSize - 1;
  start = Math.max(0, Math.min(start, fileSize - 1));
  end = Math.max(0, Math.min(end, fileSize - 1));
  if (start > end) return null;
  return { start, end };
};

export const streamBookWithRange = (req: Request, res: Response, filePath: string) => {
  beLog("streamBookWithRange", { hasRange: Boolean(req.headers.range) });
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] ?? "application/octet-stream";
  if (ext === ".pdf") res.setHeader("Cache-Control", "private, no-transform");
  const fileSize = statSync(filePath).size;
  const range = req.headers.range;

  if (range) {
    if (fileSize === 0) {
      res.status(416).setHeader("Content-Range", "bytes */0").end();
      return;
    }
    const parsed = parseSingleByteRange(range, fileSize);
    if (!parsed) {
      res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).end();
      return;
    }
    const { start, end } = parsed;
    beLog("streamBookWithRange_range", { rangeIn: range, start, end, fileSize });
    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", chunkSize);
    res.setHeader("Content-Type", mimeType);
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Length", fileSize);
  res.setHeader("Content-Type", mimeType);
  createReadStream(filePath).pipe(res);
};
