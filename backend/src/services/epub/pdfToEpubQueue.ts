import type { PrismaClient } from "@prisma/client";
import { convertPdfToEpub } from "./pdfToEpubConvert";
import { beLog, beLogErr } from "../../utils/beLog";
import { unlink } from "fs/promises";
import { basename, dirname, extname, join, resolve } from "path";
import { existsSync, statSync } from "fs";

type Job = { bookId: number };

const CONCURRENCY = 1;
const queue: Job[] = [];
let running = 0;
const enqueued = new Set<number>();

export const enqueuePdfToEpubForBook = async (db: PrismaClient, bookId: number) => {
  const enabled = await isPdfToEpubEnabled(db);
  if (!enabled) return false;

  if (enqueued.has(bookId)) return false;
  enqueued.add(bookId);
  queue.push({ bookId });
  void drain(db);
  return true;
};

const drain = async (db: PrismaClient) => {
  if (running >= CONCURRENCY) return;
  const job = queue.shift();
  if (!job) return;

  running += 1;
  try {
    await runJob(db, job);
  } catch (e) {
    beLogErr("pdfToEpub_job_failed", e, job);
  } finally {
    enqueued.delete(job.bookId);
    running -= 1;
    if (queue.length > 0) void drain(db);
  }
};

const runJob = async (db: PrismaClient, job: Job) => {
  const row = await db.book.findUnique({ where: { id: job.bookId }, include: { library: true } });
  if (!row) return;

  const meta = safeJson(row.metadata);
  const fileExt = readMetaFileExt(meta) ?? extname(row.filePath).slice(1).toLowerCase();
  if (fileExt !== "pdf") return;
  if (!existsSync(row.filePath)) return;

  const outPath = outputEpubPathForPdf(row.filePath);
  if (isNonEmptyFile(outPath)) {
    await tryUpdateBookToEpub(db, row.id, row.libraryId, row.filePath, outPath, meta);
    return;
  }

  beLog("pdfToEpub_convert_start", { bookId: row.id });
  await convertPdfToEpub(row.filePath, outPath);
  beLog("pdfToEpub_convert_done", { bookId: row.id });

  await tryUpdateBookToEpub(db, row.id, row.libraryId, row.filePath, outPath, meta);
};

const removeSourcePdfAfterEpubUpgrade = async (pdfPath: string, epubPath: string, bookId: number) => {
  try {
    if (extname(pdfPath).toLowerCase() !== ".pdf") return;
    if (resolve(pdfPath) === resolve(epubPath)) return;
    if (!existsSync(pdfPath)) return;
    await unlink(pdfPath);
    beLog("pdfToEpub_removed_source_pdf", { bookId });
  } catch (e) {
    beLogErr("pdfToEpub_remove_pdf_failed", e, { bookId });
  }
};

const tryUpdateBookToEpub = async (
  db: PrismaClient,
  bookId: number,
  libraryId: number,
  pdfPath: string,
  epubPath: string,
  meta: Record<string, unknown> | null
) => {
  if (!isNonEmptyFile(epubPath)) return;

  const existing = await db.book.findFirst({ where: { libraryId, filePath: epubPath } });
  if (existing && existing.id !== bookId) {
    beLog("pdfToEpub_skip_update_path_taken", { bookId, existingBookId: existing.id });
    return;
  }

  const nextMeta = {
    ...(meta ?? {}),
    fileExt: "epub",
    convertedFromPdfPath: pdfPath,
  };

  await db.book.update({
    where: { id: bookId },
    data: { filePath: epubPath, metadata: JSON.stringify(nextMeta) },
  });

  await removeSourcePdfAfterEpubUpgrade(pdfPath, epubPath, bookId);
};

const isPdfToEpubEnabled = async (db: PrismaClient) => {
  const row = await db.appCustomization.findUnique({ where: { id: 1 } });
  return row?.convertPdfToEpub === true;
};

const outputEpubPathForPdf = (pdfPath: string) => {
  const ext = extname(pdfPath);
  const base = ext ? pdfPath.slice(0, -ext.length) : pdfPath;
  const candidate = `${base}.epub`;
  if (!existsSync(candidate)) return candidate;

  const dir = dirname(pdfPath);
  const name = basename(base);
  return join(dir, `${name}.converted.epub`);
};

const isNonEmptyFile = (p: string) => {
  try {
    return statSync(p).isFile() && statSync(p).size > 0;
  } catch {
    return false;
  }
};

const safeJson = (raw: string | null) => {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    return v as Record<string, unknown>;
  } catch {
    return null;
  }
};

const readMetaFileExt = (meta: Record<string, unknown> | null) => {
  const v = meta?.fileExt;
  return typeof v === "string" && v.trim() ? v.trim().toLowerCase() : null;
};

