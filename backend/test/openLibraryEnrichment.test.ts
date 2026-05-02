import type { EnrichmentPayload } from "../src/services/openLibraryEnrichment";
import {
  enrichBookRecord,
  enrichSeriesRecord,
  fetchWorkEnrichment,
  mergeBookOpenLibrary,
  mergeSeriesOpenLibrary,
  resolveWorkKey,
} from "../src/services/openLibraryEnrichment";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { rmSync } from "fs";
import { assignGlobalFetch } from "./assignGlobalFetch";
import { ensureTestLibraryOwnerUser, newTestWorkDir, runDbPush, sqliteUrlInDir } from "./testDb";

const sampleEnrichment = (): EnrichmentPayload => ({
  enrichedAt: "2020-01-01T00:00:00.000Z",
  workKey: "/works/OL1W",
  description: "Desc",
  subjects: ["a", "b"],
  ratingsAverage: 4.2,
  ratingsCount: 10,
  workTitle: "WT",
});

describe("mergeBookOpenLibrary", () => {
  test("merges enrichment and sets openLibraryWorkKey", () => {
    const merged = mergeBookOpenLibrary({ author: "A" }, sampleEnrichment());
    expect(merged.openLibraryWorkKey).toBe("/works/OL1W");
    expect((merged as Record<string, unknown>).author).toBe("A");
    expect((merged.openLibrary as { sourceVersion?: number }).sourceVersion).toBe(3);
  });
});

describe("mergeSeriesOpenLibrary", () => {
  test("merges series-side openLibrary block", () => {
    const merged = mergeSeriesOpenLibrary(null, sampleEnrichment());
    expect(merged.openLibraryWorkKey).toBe("/works/OL1W");
    expect((merged.openLibrary as { workKey: string }).workKey).toBe("/works/OL1W");
  });
});

describe("resolveWorkKey", () => {
  const orig = globalThis.fetch;
  afterAll(() => {
    globalThis.fetch = orig;
  });

  test("returns works hint unchanged", async () => {
    expect(await resolveWorkKey("x", null, "/works/OL9W")).toBe("/works/OL9W");
  });

  test("search picks first works key from docs", async () => {
    assignGlobalFetch(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ docs: [{ key: "/works/OL2W" }] }),
      } as Response)
    );
    expect(await resolveWorkKey("T", null, null)).toBe("/works/OL2W");
  });
});

describe("fetchWorkEnrichment", () => {
  const orig = globalThis.fetch;
  afterAll(() => {
    globalThis.fetch = orig;
  });

  test("returns null when work json missing", async () => {
    assignGlobalFetch((url: string | URL) => {
      const s = String(url);
      if (s.includes("/ratings.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ summary: {} }) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(null) } as Response);
    });
    expect(await fetchWorkEnrichment("/works/OLX")).toBeNull();
  });

  test("returns payload when work and ratings load", async () => {
    assignGlobalFetch((url: string | URL) => {
      const s = String(url);
      if (s.includes("/ratings.json"))
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ summary: { average: 3, count: 2 } }),
        } as Response);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            title: "Book",
            description: "About",
            subjects: ["x"],
          }),
      } as Response);
    });
    const e = await fetchWorkEnrichment("/works/OLZ");
    expect(e).not.toBeNull();
    expect(e!.workKey).toBe("/works/OLZ");
    expect(e!.ratingsAverage).toBe(3);
    expect(e!.subjects).toEqual(["x"]);
  });
});

describe("enrichBookRecord short-circuit", () => {
  let prisma: PrismaClient;
  let testDir: string;

  beforeAll(async () => {
    testDir = newTestWorkDir();
    runDbPush(sqliteUrlInDir(testDir));
    prisma = new PrismaClient({ datasources: { db: { url: sqliteUrlInDir(testDir) } } });
    await prisma.$connect();
    await ensureTestLibraryOwnerUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    rmSync(testDir, { recursive: true, force: true });
  });

  test("returns book unchanged when already enriched at current version", async () => {
    const lib = await prisma.library.create({ data: { name: "L", path: ".", type: "NOVEL" } });
    const meta = JSON.stringify({
      openLibrary: { enrichedAt: "2021-01-01", fetchFailed: false, sourceVersion: 3 },
    });
    const book = await prisma.book.create({
      data: { libraryId: lib.id, title: "T", filePath: "/x.pdf", metadata: meta },
    });
    const out = await enrichBookRecord(prisma, book.id);
    expect(out!.id).toBe(book.id);
    expect(out!.metadata).toBe(meta);
  });
});

describe("enrichSeriesRecord short-circuit", () => {
  let prisma: PrismaClient;
  let testDir: string;

  beforeAll(async () => {
    testDir = newTestWorkDir();
    runDbPush(sqliteUrlInDir(testDir));
    prisma = new PrismaClient({ datasources: { db: { url: sqliteUrlInDir(testDir) } } });
    await prisma.$connect();
    await ensureTestLibraryOwnerUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    rmSync(testDir, { recursive: true, force: true });
  });

  test("returns series unchanged when already enriched", async () => {
    const lib = await prisma.library.create({ data: { name: "L2", path: ".", type: "NOVEL" } });
    const meta = JSON.stringify({
      openLibrary: { enrichedAt: "2021-01-01", fetchFailed: false, sourceVersion: 3 },
    });
    const s = await prisma.series.create({
      data: { libraryId: lib.id, title: "S", status: "ONGOING", metadata: meta },
    });
    const out = await enrichSeriesRecord(prisma, s.id);
    expect(out!.id).toBe(s.id);
    expect(out!.metadata).toBe(meta);
  });
});
