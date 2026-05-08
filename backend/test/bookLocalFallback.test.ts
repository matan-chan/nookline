import { applyLocalBookFallback, persistBookDerivedCoverIfPossible, resolveBookFileOnDisk } from "../src/services/book/bookLocalFallback";
import { resolveLibraryCoverCacheDir } from "../src/services/library/libraryPathResolve";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { ensureTestLibraryOwnerUser, newTestWorkDir, runDbPush, sqliteUrlInDir } from "./testDb";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { dirname, join, resolve } from "path";

describe("bookLocalFallback", { timeout: 60_000 }, () => {
  let prisma: PrismaClient;
  let testDir: string;
  let uploadDir: string;
  const prevUploadDir = process.env.UPLOAD_DIR;

  beforeAll(async () => {
    testDir = newTestWorkDir();
    uploadDir = join(testDir, "uploads");
    mkdirSync(uploadDir, { recursive: true });
    process.env.UPLOAD_DIR = uploadDir;
    const databaseUrl = sqliteUrlInDir(testDir);
    runDbPush(databaseUrl);
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    await ensureTestLibraryOwnerUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (prevUploadDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = prevUploadDir;
    rmSync(testDir, { recursive: true, force: true });
  });

  test("applyLocalBookFallback returns null when book does not exist", async () => {
    const out = await applyLocalBookFallback(prisma, 9_999_999);
    expect(out).toBeNull();
  });

  test("applyLocalBookFallback leaves book unchanged when pdf path is missing", async () => {
    const lib = await prisma.library.create({
      data: { name: "L", path: ".", type: "NOVEL" },
    });
    const missing = join(uploadDir, "nope.pdf");
    const book = await prisma.book.create({
      data: { libraryId: lib.id, title: "T", filePath: missing },
    });
    const out = await applyLocalBookFallback(prisma, book.id);
    expect(out).not.toBeNull();
    expect(out!.title).toBe("T");
    expect(out!.filePath).toBe(missing);
  });

  test("applyLocalBookFallback skips work for non-pdf non-epub extension", async () => {
    const lib = await prisma.library.create({
      data: { name: "L2", path: ".", type: "NOVEL" },
    });
    const p = join(uploadDir, "note.txt");
    writeFileSync(p, "x");
    const book = await prisma.book.create({
      data: { libraryId: lib.id, title: "Note", filePath: p },
    });
    const out = await applyLocalBookFallback(prisma, book.id);
    expect(out!.title).toBe("Note");
  });

  test("applyLocalBookFallback resolves relative filePath under library folder", async () => {
    const libPath = join(uploadDir, "shelf");
    mkdirSync(libPath, { recursive: true });
    const relName = "inside.pdf";
    writeFileSync(join(libPath, relName), "");
    const lib = await prisma.library.create({
      data: { name: "Rel Lib", path: "shelf", type: "NOVEL" },
    });
    const book = await prisma.book.create({
      data: { libraryId: lib.id, title: "Rel", filePath: relName },
    });
    const out = await applyLocalBookFallback(prisma, book.id);
    expect(out).not.toBeNull();
    const meta = JSON.parse(out!.metadata ?? "{}") as { localFallback?: { filenameSlug?: string } };
    expect(meta.localFallback?.filenameSlug).toBe("inside");
  });

  test("resolveLibraryCoverCacheDir is UPLOAD_DIR/.cover-cache for relative library paths", () => {
    expect(resolveLibraryCoverCacheDir("comedy")).toBe(join(resolve(uploadDir), ".cover-cache"));
    expect(resolveLibraryCoverCacheDir(".")).toBe(join(resolve(uploadDir), ".cover-cache"));
  });

  test("resolveLibraryCoverCacheDir is dirname(absolute)/.cover-cache for absolute library roots", () => {
    const libAbs = resolve(join(uploadDir, "yy"));
    expect(resolveLibraryCoverCacheDir(libAbs)).toBe(join(dirname(libAbs), ".cover-cache"));
  });

  test("persistBookDerivedCoverIfPossible returns null when book file is missing", async () => {
    const lib = await prisma.library.create({
      data: { name: "L3", path: ".", type: "NOVEL" },
    });
    const book = await prisma.book.create({
      data: { libraryId: lib.id, title: "X", filePath: join(uploadDir, "ghost.pdf") },
    });
    const coverPath = await persistBookDerivedCoverIfPossible(prisma, book.id);
    expect(coverPath).toBeNull();
  });
});

describe("book a.pdf under books-base and comedy shelf", { timeout: 60_000 }, () => {
  let prisma: PrismaClient;
  let testDir: string;
  let booksBase: string;
  const prevUploadDir = process.env.UPLOAD_DIR;

  beforeAll(async () => {
    testDir = newTestWorkDir();
    booksBase = join(testDir, "books-base");
    mkdirSync(join(booksBase, "comedy"), { recursive: true });
    writeFileSync(join(booksBase, "comedy", "a.pdf"), "%PDF-1.4\n%\n");
    process.env.UPLOAD_DIR = booksBase;
    const databaseUrl = sqliteUrlInDir(testDir);
    runDbPush(databaseUrl);
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    await ensureTestLibraryOwnerUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (prevUploadDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = prevUploadDir;
    rmSync(testDir, { recursive: true, force: true });
  });

  const expectedComedyPdf = () => resolve(booksBase, "comedy", "a.pdf");

  for (const libraryPath of ["comedy", "/comedy", "\\comedy"] as const) {
    test(`stored filePath a.pdf with library path "${libraryPath}" resolves to books-base/comedy/a.pdf`, async () => {
      process.env.UPLOAD_DIR = booksBase;
      const lib = await prisma.library.create({
        data: { name: `Shelf ${libraryPath}`, path: libraryPath, type: "NOVEL" },
      });
      const storedPath = "a.pdf";
      expect(resolveBookFileOnDisk(lib.path, storedPath)).toBe(expectedComedyPdf());
      const book = await prisma.book.create({
        data: { libraryId: lib.id, title: "a.pdf", filePath: storedPath },
      });
      const out = await applyLocalBookFallback(prisma, book.id);
      expect(out).not.toBeNull();
      const meta = JSON.parse(out!.metadata ?? "{}") as { localFallback?: { filenameSlug?: string } };
      expect(meta.localFallback?.filenameSlug).toBe("a");
    });
  }
});
