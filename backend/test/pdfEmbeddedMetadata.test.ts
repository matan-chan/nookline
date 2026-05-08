import { extractPdfEmbeddedMetadata } from "../src/services/pdf/pdfEmbeddedMetadata";
import { PDFDocument } from "pdf-lib";
import { afterAll, describe, expect, test } from "bun:test";
import { rmSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { newTestWorkDir } from "./testDb";

describe("extractPdfEmbeddedMetadata", () => {
  let dir: string;

  test("returns nulls when file exceeds size limit", async () => {
    const out = await extractPdfEmbeddedMetadata("/nope.pdf", 50 * 1024 * 1024);
    expect(out).toEqual({ title: null, author: null });
  });

  test("reads title and author from pdf", async () => {
    dir = newTestWorkDir();
    const pdfPath = join(dir, "m.pdf");
    const doc = await PDFDocument.create();
    doc.setTitle("  My Title  ");
    doc.setAuthor("  Author Name  ");
    const bytes = await doc.save();
    writeFileSync(pdfPath, Buffer.from(bytes));
    const st = statSync(pdfPath);
    const out = await extractPdfEmbeddedMetadata(pdfPath, st.size);
    expect(out.title).toBe("My Title");
    expect(out.author).toBe("Author Name");
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });
});
