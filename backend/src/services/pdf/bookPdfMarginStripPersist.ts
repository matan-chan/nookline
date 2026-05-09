import { inferPdfRepeatingHeaderFooterRegexes } from "./pdfRepeatingHeaderFooterRegex";
import { resolveBookFileOnDisk } from "../book/bookLocalFallback";
import { beLog, beLogErr } from "../../utils/beLog";
import type { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
import { extname } from "path";
import { existsSync } from "fs";

const parseBookMetadataRecord = (raw: string | null): Record<string, unknown> => {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw);
    if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, unknown>;
  } catch (e) {
    beLogErr("parseBookMetadataRecord", e);
  }
  return {};
};

const sameStringArray = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export const inferAndPersistPdfMarginStripRegexes = async (db: PrismaClient, bookId: number): Promise<void> => {
  beLog("inferAndPersistPdfMarginStripRegexes", { bookId });
  const book = await db.book.findUnique({ where: { id: bookId }, include: { library: true } });
  if (!book?.library) return;
  const absFilePath = resolveBookFileOnDisk(book.library.path, book.filePath);
  if (extname(absFilePath).toLowerCase() !== ".pdf") return;
  if (!existsSync(absFilePath)) return;
  let buf: Buffer;
  try {
    buf = await readFile(absFilePath);
  } catch (e) {
    beLogErr("inferAndPersistPdfMarginStripRegexes_readFile", e, { bookId });
    return;
  }
  let regexes: string[];
  try {
    regexes = (await inferPdfRepeatingHeaderFooterRegexes(new Uint8Array(buf))).regexes;
  } catch (e) {
    beLogErr("inferAndPersistPdfMarginStripRegexes_infer", e, { bookId });
    return;
  }
  if (regexes.length === 0) return;
  const meta = parseBookMetadataRecord(book.metadata);
  const prev = meta.pdfMarginStripRegexes;
  if (Array.isArray(prev) && prev.every((x) => typeof x === "string") && sameStringArray(prev as string[], regexes)) return;
  const merged = { ...meta, pdfMarginStripRegexes: regexes };
  try {
    await db.book.update({ where: { id: bookId }, data: { metadata: JSON.stringify(merged) } });
  } catch (e) {
    beLogErr("inferAndPersistPdfMarginStripRegexes_update", e, { bookId });
  }
};
