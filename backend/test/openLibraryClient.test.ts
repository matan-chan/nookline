import {
  OL_SEARCH_FIELDS_WORK_KEY,
  OPEN_LIBRARY_COVERS_ORIGIN,
  OPEN_LIBRARY_ORIGIN,
  fetchOpenLibraryCoverResponse,
  fetchOpenLibraryJson,
  openLibraryBooksByIsbnUrl,
  openLibraryCoverLargeUrl,
  openLibraryKeyJsonUrl,
  openLibrarySearchByTitleUrl,
  openLibraryWorkRatingsUrl,
} from "../src/services/openLibrary/openLibraryClient";
import { assignGlobalFetch } from "./assignGlobalFetch";
import { afterEach, describe, expect, test } from "bun:test";

describe("openLibraryClient URL builders", () => {
  test("OPEN_LIBRARY_ORIGIN", () => {
    expect(OPEN_LIBRARY_ORIGIN).toBe("https://openlibrary.org");
  });
  test("OPEN_LIBRARY_COVERS_ORIGIN", () => {
    expect(OPEN_LIBRARY_COVERS_ORIGIN).toBe("https://covers.openlibrary.org");
  });
  test("openLibraryCoverLargeUrl", () => {
    expect(openLibraryCoverLargeUrl(42)).toBe("https://covers.openlibrary.org/b/id/42-L.jpg");
  });
  test("openLibraryKeyJsonUrl", () => {
    expect(openLibraryKeyJsonUrl("/works/OL1W")).toBe("https://openlibrary.org/works/OL1W.json");
  });
  test("openLibraryWorkRatingsUrl", () => {
    expect(openLibraryWorkRatingsUrl("/works/OL1W")).toBe("https://openlibrary.org/works/OL1W/ratings.json");
  });
  test("openLibrarySearchByTitleUrl without author", () => {
    const u = openLibrarySearchByTitleUrl("Hamlet", null, 5, OL_SEARCH_FIELDS_WORK_KEY);
    expect(u).toContain("title=Hamlet");
    expect(u).toContain("limit=5");
    expect(u).toContain(`fields=${OL_SEARCH_FIELDS_WORK_KEY}`);
    expect(u).not.toContain("author=");
  });
  test("openLibrarySearchByTitleUrl with author", () => {
    const u = openLibrarySearchByTitleUrl("Hamlet", "Shakespeare", 1, "key");
    expect(u).toContain("author=");
    expect(u).toContain("Shakespeare");
  });
  test("openLibraryBooksByIsbnUrl", () => {
    expect(openLibraryBooksByIsbnUrl("9780")).toContain("bibkeys=ISBN:9780");
  });
  test("OL_SEARCH_FIELDS_WORK_KEY", () => {
    expect(OL_SEARCH_FIELDS_WORK_KEY).toBe("key,title");
  });
});

describe("fetchOpenLibraryJson", () => {
  const orig = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = orig;
  });

  test("returns parsed body on ok response", async () => {
    assignGlobalFetch(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ hello: 1 }),
      } as Response)
    );
    const url = `https://example.test/json-${Math.random()}`;
    expect(await fetchOpenLibraryJson(url)).toEqual({ hello: 1 });
  });

  test("returns null on non-ok response", async () => {
    assignGlobalFetch(() => Promise.resolve({ ok: false, json: async () => ({}) } as Response));
    expect(await fetchOpenLibraryJson(`https://example.test/fail-${Math.random()}`)).toBeNull();
  });
});

describe("fetchOpenLibraryCoverResponse", () => {
  test("requests covers origin with large suffix", async () => {
    const orig = globalThis.fetch;
    let seenUrl = "";
    assignGlobalFetch((input: string | URL) => {
      seenUrl = String(input);
      return Promise.resolve({ ok: true, arrayBuffer: () => new ArrayBuffer(8) } as unknown as Response);
    });
    await fetchOpenLibraryCoverResponse(7);
    expect(seenUrl).toBe(openLibraryCoverLargeUrl(7));
    globalThis.fetch = orig;
  });
});
