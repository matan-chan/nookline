import { execFileSync } from "child_process";
import { beLog, beLogErr } from "../../utils/beLog";
import { mkdtempSync, readdirSync, rmSync, statSync } from "fs";
import { readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import JSZip from "jszip";
import sharp from "sharp";
import { findOpfItemHrefById, findZipEntryKey, resolveZipPath } from "./bookFilenameInference";
import { renderPdfFirstPageWebpViaPdfJs } from "../pdf/pdfFirstPageWebp";

const COVER_MAX_W = 560;
const COVER_MAX_H = 800;
const WEBP_Q = 86;
const MAX_PDF_BYTES = 120 * 1024 * 1024;

export const tryGenerateCoverWebp = async (filePath: string, ext: string, outPath: string): Promise<boolean> => {
  beLog("tryGenerateCoverWebp", { ext });
  try {
    if (ext === ".pdf") return await tryGeneratePdfCoverWebp(filePath, outPath);
    if (ext === ".epub") return await extractEpubCoverWebp(filePath, outPath);
  } catch (e) {
    beLogErr("tryGenerateCoverWebp", e, { ext });
    return false;
  }
  return false;
};

export const extractEpubCoverWebp = async (epubPath: string, outPath: string): Promise<boolean> => {
  beLog("extractEpubCoverWebp");
  let buf: Buffer;
  try {
    buf = await readFile(epubPath);
  } catch {
    return false;
  }
  const zip = await JSZip.loadAsync(buf);
  const container = zip.file("META-INF/container.xml");
  if (!container) return false;
  const cx = await container.async("string");
  const rootM = /full-path\s*=\s*["']([^"']+)["']/i.exec(cx);
  if (!rootM) return false;
  const opfPath = rootM[1].replace(/^\//, "");
  const opfEntry = findZipEntryKey(zip.files, opfPath);
  if (!opfEntry) return false;
  const opfFile = zip.file(opfEntry);
  if (!opfFile) return false;
  const opf = await opfFile.async("string");
  let href = opfCoverHref(opf);
  if (!href) {
    const anyCover = /<item\b[^>]*href\s*=\s*["']([^"']+\.(jpe?g|png|webp))["']/gi;
    let m: RegExpExecArray | null;
    while ((m = anyCover.exec(opf))) {
      if (/cover/i.test(m[0])) {
        href = m[1];
        break;
      }
    }
  }
  if (!href) return false;
  const rel = resolveZipPath(opfPath, href);
  const imgKey = findZipEntryKey(zip.files, rel);
  if (!imgKey) return false;
  const imgEntry = zip.file(imgKey);
  if (!imgEntry) return false;
  const imgBuf = Buffer.from(await imgEntry.async("arraybuffer"));
  await sharp(imgBuf)
    .rotate()
    .resize({ width: COVER_MAX_W, height: COVER_MAX_H, fit: "inside", withoutEnlargement: false })
    .webp({ quality: WEBP_Q })
    .toFile(outPath);
  return true;
};

export const renderPdfFirstPageWebp = async (pdfPath: string, outPath: string) => {
  beLog("renderPdfFirstPageWebp");
  await sharp(pdfPath, { page: 0, density: 144 })
    .rotate()
    .resize({ width: COVER_MAX_W, height: COVER_MAX_H, fit: "inside", withoutEnlargement: false })
    .webp({ quality: WEBP_Q })
    .toFile(outPath);
};

const tryGeneratePdfCoverWebp = async (filePath: string, outPath: string): Promise<boolean> => {
  beLog("tryGeneratePdfCoverWebp");
  const st = statSync(filePath);
  if (st.size > MAX_PDF_BYTES) return false;
  try {
    await renderPdfFirstPageWebp(filePath, outPath);
    return true;
  } catch {
    const hit = renderPdfFirstPageViaPdftoppm(filePath);
    if (hit) {
      try {
        await sharp(hit.pngPath)
          .rotate()
          .resize({ width: COVER_MAX_W, height: COVER_MAX_H, fit: "inside", withoutEnlargement: false })
          .webp({ quality: WEBP_Q })
          .toFile(outPath);
        return true;
      } catch {
      } finally {
        rmSync(hit.dir, { recursive: true, force: true });
      }
    }
    if (await renderPdfFirstPageWebpViaPdfJs(filePath, outPath)) return true;
  }
  return false;
};

const renderPdfFirstPageViaPdftoppm = (pdfPath: string): { pngPath: string; dir: string } | null => {
  beLog("renderPdfFirstPageViaPdftoppm");
  const dir = mkdtempSync(join(tmpdir(), "nookline-pdf-"));
  const prefix = join(dir, "p");
  try {
    execFileSync("pdftoppm", ["-png", "-f", "1", "-l", "1", "-r", "144", pdfPath, prefix], { stdio: "ignore" });
  } catch (e) {
    beLogErr("renderPdfFirstPageViaPdftoppm_pdftoppm", e);
    rmSync(dir, { recursive: true, force: true });
    return null;
  }
  const pngs = readdirSync(dir).filter((f) => f.endsWith(".png"));
  if (pngs.length === 0) {
    rmSync(dir, { recursive: true, force: true });
    return null;
  }
  return { pngPath: join(dir, pngs[0]), dir };
};

const opfCoverHref = (opf: string): string | null => {
  const prop = /<item\b[^>]*properties\s*=\s*["'][^"']*cover-image[^"']*["'][^>]*\/?>/i.exec(opf);
  if (prop) {
    const hrefM = /\bhref\s*=\s*["']([^"']+)["']/i.exec(prop[0]);
    if (hrefM) return hrefM[1];
  }
  const meta1 =
    /<meta\b[^>]*name\s*=\s*["']cover["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*\/?>/i.exec(opf) ||
    /<meta\b[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']cover["'][^>]*\/?>/i.exec(opf);
  if (meta1) {
    const href = findOpfItemHrefById(opf, meta1[1]);
    if (href) return href;
  }
  const itemImg = /<item\b[^>]*href\s*=\s*["']([^"']+\.(jpe?g|png|webp))["'][^>]*media-type\s*=\s*["']image\/[^"']+["'][^>]*\/?>/gi;
  let im: RegExpExecArray | null;
  while ((im = itemImg.exec(opf))) {
    const block = im[0];
    if (/cover|titlepage|front/i.test(block + im[1])) return im[1];
  }
  return null;
};
