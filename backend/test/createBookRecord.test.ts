import { createBookRecord } from "../src/services/createBookRecord";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { ensureTestLibraryOwnerUser, newTestWorkDir, runDbPush, sqliteUrlInDir } from "./testDb";
import { rmSync } from "fs";
import { join } from "path";

describe("createBookRecord", () => {
  let prisma: PrismaClient;
  let testDir: string;

  beforeAll(async () => {
    testDir = newTestWorkDir();
    const databaseUrl = sqliteUrlInDir(testDir);
    runDbPush(databaseUrl);
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    await ensureTestLibraryOwnerUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    rmSync(testDir, { recursive: true, force: true });
  });

  test("creates a book for a library with expected fields", async () => {
    const lib = await prisma.library.create({
      data: { name: "Test Lib", path: ".", type: "NOVEL" },
    });
    const filePath = join(testDir, "1730000000000_dummy.pdf");
    const book = await createBookRecord(prisma, {
      libraryId: lib.id,
      title: "My Book",
      filePath,
      metadata: JSON.stringify({ fileExt: "pdf" }),
    });
    expect(book.id).toBeGreaterThan(0);
    expect(book.libraryId).toBe(lib.id);
    expect(book.title).toBe("My Book");
    expect(book.filePath).toBe(filePath);
    expect(book.seriesId).toBeNull();
  });

  test("creates a series when openLibrarySeriesName is set", async () => {
    const lib = await prisma.library.create({
      data: { name: "Series Lib", path: "novels", type: "NOVEL" },
    });
    expect(await prisma.series.count({ where: { libraryId: lib.id } })).toBe(0);
    await createBookRecord(prisma, {
      libraryId: lib.id,
      title: "Volume 1",
      filePath: join(testDir, "v1.pdf"),
      openLibrarySeriesName: "The Saga",
    });
    const seriesList = await prisma.series.findMany({ where: { libraryId: lib.id } });
    expect(seriesList.length).toBe(1);
    expect(seriesList[0].title).toBe("The Saga");
    const books = await prisma.book.findMany({ where: { libraryId: lib.id } });
    expect(books.length).toBe(1);
    expect(books[0].seriesId).toBe(seriesList[0].id);
  });

  test("reuses one series for multiple books with same openLibrarySeriesName", async () => {
    const lib = await prisma.library.create({
      data: { name: "Shared Series Lib", path: "x", type: "NOVEL" },
    });
    await createBookRecord(prisma, {
      libraryId: lib.id,
      title: "Part A",
      filePath: join(testDir, "part-a.pdf"),
      openLibrarySeriesName: "Shared",
    });
    await createBookRecord(prisma, {
      libraryId: lib.id,
      title: "Part B",
      filePath: join(testDir, "part-b.pdf"),
      openLibrarySeriesName: "Shared",
    });
    expect(await prisma.series.count({ where: { libraryId: lib.id, title: "Shared" } })).toBe(1);
    const books = await prisma.book.findMany({ where: { libraryId: lib.id } });
    expect(books.length).toBe(2);
    expect(new Set(books.map((b) => b.seriesId)).size).toBe(1);
  });
});
