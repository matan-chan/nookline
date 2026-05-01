import { inferPdfRepeatingHeaderFooterRegexes } from "../src/services/pdfRepeatingHeaderFooterRegex";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, test } from "bun:test";

const PAGE_W = 612;
const PAGE_H = 792;

const stripWithLineRegexes = (text: string, regexes: string[]) => {
  let t = text;
  for (const re of regexes) t = t.replace(new RegExp(re, "gm"), "");
  return t.replace(/\n{3,}/g, "\n\n").trim();
};

const matchesAnyLineRegex = (line: string, regexes: string[]) =>
  regexes.some((re) => new RegExp(re, "m").test(line.trim()));

const buildNumberPipeTitleFooterPdf = async (pageCount: number) => {
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

const buildTitlePipeNumberHeaderPdf = async (pageCount: number) => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pageCount; i++) {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawText(`INTRODUCTION | ${i + 1}`, { x: 72, y: PAGE_H - 52, size: 10, font });
    p.drawText(`Body continues here on page ${i + 1}.`, { x: 72, y: PAGE_H / 2, size: 11, font });
  }
  return new Uint8Array(await doc.save());
};

describe("inferPdfRepeatingHeaderFooterRegexes", () => {
  test("infers regex for repeating footer number pipe title", async () => {
    const pdf = await buildNumberPipeTitleFooterPdf(6);
    const { regexes } = await inferPdfRepeatingHeaderFooterRegexes(pdf);
    expect(regexes.length).toBeGreaterThan(0);
    const sample = "Some text\n5 | THE BEHAVIOR OPS MANUAL\nmore";
    const stripped = stripWithLineRegexes(sample, regexes);
    expect(stripped).not.toContain("THE BEHAVIOR OPS MANUAL");
    expect(stripped).toContain("Some text");
    expect(stripped).toContain("more");
  });

  test("infers regex for repeating header title pipe page number", async () => {
    const pdf = await buildTitlePipeNumberHeaderPdf(6);
    const { regexes } = await inferPdfRepeatingHeaderFooterRegexes(pdf);
    expect(regexes.length).toBeGreaterThan(0);
    expect(matchesAnyLineRegex("INTRODUCTION | 9", regexes)).toBe(true);
  });

  test("returns no regexes when pdf has fewer than three pages", async () => {
    const pdf = await buildNumberPipeTitleFooterPdf(2);
    const { regexes } = await inferPdfRepeatingHeaderFooterRegexes(pdf);
    expect(regexes).toEqual([]);
  });
});
