import { PDFDocument, StandardFonts } from "pdf-lib";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, "..", "tests", "fixtures");
mkdirSync(outDir, { recursive: true });

const PAGE_W = 612;
const PAGE_H = 792;

const footerPdf = async (pageCount) => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pageCount; i++) {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawText(`Unique narrative body text for page ${i + 1} with sufficient length.`, {
      x: 72,
      y: PAGE_H / 2,
      size: 11,
      font,
    });
    p.drawText(`${i + 1} | THE BEHAVIOR OPS MANUAL`, { x: 72, y: 48, size: 10, font });
  }
  return new Uint8Array(await doc.save());
};

const headerPdf = async (pageCount) => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pageCount; i++) {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawText(`INTRODUCTION | ${i + 1}`, { x: 72, y: PAGE_H - 52, size: 10, font });
    p.drawText(`Body continues here on page ${i + 1}.`, { x: 72, y: PAGE_H / 2, size: 11, font });
  }
  return new Uint8Array(await doc.save());
};

writeFileSync(join(outDir, "margin-footer-6p.pdf"), Buffer.from(await footerPdf(6)));
writeFileSync(join(outDir, "margin-footer-2p.pdf"), Buffer.from(await footerPdf(2)));
writeFileSync(join(outDir, "margin-header-6p.pdf"), Buffer.from(await headerPdf(6)));
console.log("wrote margin fixtures to", outDir);