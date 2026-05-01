import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import { beLog, beLogErr } from "../utils/beLog";

const MAX_BYTES = 40 * 1024 * 1024;

export const extractPdfEmbeddedMetadata = async (
  filePath: string,
  fileSize: number
): Promise<{ title: string | null; author: string | null }> => {
  beLog("extractPdfEmbeddedMetadata", { fileSize });
  if (fileSize > MAX_BYTES) return { title: null, author: null };
  try {
    const buf = await readFile(filePath);
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return {
      title: cleanMeta(doc.getTitle()),
      author: cleanMeta(doc.getAuthor()),
    };
  } catch (e) {
    beLogErr("extractPdfEmbeddedMetadata", e, { filePath: filePath.slice(0, 120) });
    return { title: null, author: null };
  }
};

const cleanMeta = (raw: string | undefined): string | null => {
  if (raw == null) return null;
  const t = String(raw).replace(/\0/g, "").trim().replace(/\s+/g, " ");
  return t.length ? t : null;
};
