import { inferTitleAuthorFromPdfPlainLines } from "../src/services/pdfFirstPageTextInference";
import { describe, expect, test } from "bun:test";

describe("inferTitleAuthorFromPdfPlainLines", () => {
  test("single line Title by Author", () => {
    expect(inferTitleAuthorFromPdfPlainLines(["Don Quixote by Miguel de Cervantes"])).toEqual({
      title: "Don Quixote",
      author: "Miguel de Cervantes",
    });
  });

  test("stacked lines then by-line", () => {
    expect(
      inferTitleAuthorFromPdfPlainLines(["THE ADVENTURES", "OF TOM SAWYER", "by Mark Twain"]),
    ).toEqual({
      title: "THE ADVENTURES OF TOM SAWYER",
      author: "Mark Twain",
    });
  });

  test("ignores noise and uses by-line", () => {
    expect(
      inferTitleAuthorFromPdfPlainLines(["3", "Copyright 1999", "Pride and Prejudice", "by Jane Austen"]),
    ).toEqual({
      title: "Pride and Prejudice",
      author: "Jane Austen",
    });
  });

  test("returns null when no by pattern", () => {
    expect(inferTitleAuthorFromPdfPlainLines(["Some Title Only", "Subtitle Here"])).toEqual({
      title: null,
      author: null,
    });
  });
});
