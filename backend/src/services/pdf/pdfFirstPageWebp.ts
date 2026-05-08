import { readFile } from "fs/promises";
import { beLog, beLogErr } from "../../utils/beLog";
import { createRequire } from "module";
import { dirname, join } from "path";
import { pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";

const COVER_MAX_W = 560;
const COVER_MAX_H = 800;
const WEBP_Q = 86;
const PDF_POINTS_PER_INCH = 72;
const RENDER_DPI = 144;
const PDF_RENDER_SCALE = RENDER_DPI / PDF_POINTS_PER_INCH;

const require = createRequire(import.meta.url);

export const renderPdfFirstPageWebpViaPdfJs = async (pdfPath: string, outPath: string): Promise<boolean> => {
  beLog("renderPdfFirstPageWebpViaPdfJs");
  try {
    const doc = await openPdfJsDocument(pdfPath);
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const w = Math.ceil(viewport.width);
    const h = Math.ceil(viewport.height);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx as never, viewport }).promise;
    await doc.destroy();
    const png = canvas.toBuffer("image/png");
    await writePngBufferAsCoverWebp(png, outPath);
    return true;
  } catch (e) {
    beLogErr("renderPdfFirstPageWebpViaPdfJs", e);
    return false;
  }
};

const writePngBufferAsCoverWebp = async (png: Buffer, outPath: string) => {
  await sharp(png)
    .rotate()
    .resize({ width: COVER_MAX_W, height: COVER_MAX_H, fit: "inside", withoutEnlargement: false })
    .webp({ quality: WEBP_Q })
    .toFile(outPath);
};

const openPdfJsDocument = async (pdfPath: string) => {
  beLog("openPdfJsDocument");
  const pdfRoot = dirname(require.resolve("pdfjs-dist/package.json"));
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const V = pdfjs as { VerbosityLevel?: { ERRORS: number }; setVerbosityLevel?: (n: number) => void };
  if (typeof V.setVerbosityLevel === "function" && V.VerbosityLevel) V.setVerbosityLevel(V.VerbosityLevel.ERRORS);
  const data = new Uint8Array(await readFile(pdfPath));
  return pdfjs.getDocument({
    data,
    useSystemFonts: true,
    useWorkerFetch: false,
    verbosity: 0,
    standardFontDataUrl: pathToFileURL(join(pdfRoot, "standard_fonts/")).href,
    cMapUrl: pathToFileURL(join(pdfRoot, "cmaps/")).href,
    cMapPacked: true,
  }).promise;
};
