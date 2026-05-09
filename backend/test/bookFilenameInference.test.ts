import {
  findOpfItemHrefById,
  findZipEntryKey,
  inferFromFilenameSlug,
  resolveZipPath,
  stripLeadingOpaqueSlugPrefix,
  stripUploadTimestamp,
  titleLooksLikeRawFilename,
} from "../src/services/book/bookFilenameInference";
import { describe, expect, test } from "bun:test";

describe("stripUploadTimestamp", () => {
  test("strips leading digits and underscore from basename", () => {
    expect(stripUploadTimestamp("/vol/1730000000000_My_Book.pdf")).toBe("My_Book");
  });
  test("drops pdf extension in slug", () => {
    expect(stripUploadTimestamp("C:\\x\\1_file.epub")).toBe("file");
  });
  test("passes through when no timestamp prefix", () => {
    expect(stripUploadTimestamp("/plain.pdf")).toBe("plain");
  });
});

describe("titleLooksLikeRawFilename", () => {
  test("true when normalized title matches slug", () => {
    expect(titleLooksLikeRawFilename("my_book", "my_book")).toBe(true);
  });
  test("false when title differs from slug", () => {
    expect(titleLooksLikeRawFilename("Pride and Prejudice", "random_slug")).toBe(false);
  });
});

describe("stripLeadingOpaqueSlugPrefix", () => {
  test("strips long-id numeric segment prefix", () => {
    expect(stripLeadingOpaqueSlugPrefix("cnzrj4sazlgn6spcwfw5l0az-0046-don-quixote-miguel-de-cervantes")).toBe(
      "don-quixote-miguel-de-cervantes",
    );
  });
  test("passes through slug without opaque prefix", () => {
    expect(stripLeadingOpaqueSlugPrefix("don-quixote-miguel-de-cervantes")).toBe("don-quixote-miguel-de-cervantes");
  });
});

describe("inferFromFilenameSlug", () => {
  test("catalog hyphen slug with opaque prefix and particle surname", () => {
    expect(inferFromFilenameSlug("cnzrj4sazlgn6spcwfw5l0az-0046-don-quixote-miguel-de-cervantes")).toEqual({
      suggestedTitle: "Don Quixote",
      suggestedAuthor: "Miguel de Cervantes",
    });
  });
  test("catalog hyphen slug long title and two-word author", () => {
    expect(
      inferFromFilenameSlug(
        "dyiigbcdsscm1gnj3y8iavay-0060-the-adventures-of-tom-sawyer-complete-mark-twain",
      ),
    ).toEqual({
      suggestedTitle: "The Adventures Of Tom Sawyer Complete",
      suggestedAuthor: "Mark Twain",
    });
  });
  test("empty slug", () => {
    expect(inferFromFilenameSlug("")).toEqual({ suggestedTitle: null, suggestedAuthor: null });
  });
  test("Project Gutenberg pattern", () => {
    expect(inferFromFilenameSlug("pg1234")).toEqual({
      suggestedTitle: "Project Gutenberg eBook #1234",
      suggestedAuthor: null,
    });
  });
  test("author – title pattern", () => {
    expect(inferFromFilenameSlug("Doe - The Tale")).toEqual({
      suggestedAuthor: "Doe",
      suggestedTitle: "The Tale",
    });
  });
  test("title by author pattern", () => {
    expect(inferFromFilenameSlug("The Tale by Jane")).toEqual({
      suggestedTitle: "The Tale",
      suggestedAuthor: "Jane",
    });
  });
  test("bracket author prefix", () => {
    expect(inferFromFilenameSlug("[Doe] Story")).toEqual({
      suggestedAuthor: "Doe",
      suggestedTitle: "Story",
    });
  });
  test("fallback uses whole slug as title", () => {
    expect(inferFromFilenameSlug("SingleWord")).toEqual({ suggestedTitle: "SingleWord", suggestedAuthor: null });
  });
});

describe("findOpfItemHrefById", () => {
  test("finds href for matching id", () => {
    const opf = '<package><item id="c1" href="cover.jpg" properties="cover-image"/></package>';
    expect(findOpfItemHrefById(opf, "c1")).toBe("cover.jpg");
  });
  test("returns null when id missing", () => {
    expect(findOpfItemHrefById("<item id=\"x\" href=\"a.png\"/>", "y")).toBeNull();
  });
});

describe("resolveZipPath", () => {
  test("joins opf directory with href", () => {
    expect(resolveZipPath("OEBPS/content.opf", "Images/cover.jpg")).toBe("OEBPS/Images/cover.jpg");
  });
  test("decodes uri segments", () => {
    expect(resolveZipPath("ops/foo.opf", "img/hello%20world.png")).toBe("ops/img/hello world.png");
  });
});

describe("findZipEntryKey", () => {
  const files = {
    "OEBPS/text.xhtml": {},
    "OEBPS/Images/cover.jpg": {},
    META: { dir: true },
  } as Record<string, { dir?: boolean }>;

  test("exact match ignoring leading slash case", () => {
    expect(findZipEntryKey(files, "oebps/images/cover.jpg")).toBe("OEBPS/Images/cover.jpg");
  });
  test("suffix match when no exact", () => {
    expect(findZipEntryKey({ "prefix/OEBPS/cover.jpg": {} }, "cover.jpg")).toBe("prefix/OEBPS/cover.jpg");
  });
  test("null when not found", () => {
    expect(findZipEntryKey({ "a/b.txt": {} }, "missing")).toBeNull();
  });
});
