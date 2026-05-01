import { renderPdfFirstPageWebpViaPdfJs } from "../src/services/pdfFirstPageWebp";
import { PDFDocument } from "pdf-lib";
import { describe, expect, test } from "bun:test";
import { rmSync, writeFileSync } from "fs";
import { join } from "path";
import { newTestWorkDir } from "./testDb";

describe("renderPdfFirstPageWebpViaPdfJs", () => {
  test("writes webp when pdf has a page", async () => {
    const dir = newTestWorkDir();
    try {
      const pdfPath = join(dir, "p.pdf");
      const outPath = join(dir, "out.webp");
      const doc = await PDFDocument.create();
      doc.addPage();
      writeFileSync(pdfPath, Buffer.from(await doc.save()));
      const ok = await renderPdfFirstPageWebpViaPdfJs(pdfPath, outPath);
      expect(ok).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
