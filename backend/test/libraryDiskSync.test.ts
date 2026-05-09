import { syncLibraryBooksFromDisk } from "../src/services/library/libraryDiskSync";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { ensureTestLibraryOwnerUser, newTestWorkDir, runDbPush, sqliteUrlInDir } from "./testDb";

describe("syncLibraryBooksFromDisk", () => {
  let prisma: PrismaClient;
  let testDir: string;
  let booksRoot: string;
  const prevUpload = process.env.UPLOAD_DIR;

  beforeAll(async () => {
    testDir = newTestWorkDir();
    booksRoot = join(testDir, "books-root");
    mkdirSync(join(booksRoot, "scan"), { recursive: true });
    writeFileSync(join(booksRoot, "scan", "hello.pdf"), "%PDF-1.4\n%\n");
    process.env.UPLOAD_DIR = booksRoot;
    runDbPush(sqliteUrlInDir(testDir));
    prisma = new PrismaClient({ datasources: { db: { url: sqliteUrlInDir(testDir) } } });
    await prisma.$connect();
    await ensureTestLibraryOwnerUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (prevUpload === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = prevUpload;
    rmSync(testDir, { recursive: true, force: true });
  });

  test("imports new pdf from library folder", async () => {
    const lib = await prisma.library.create({ data: { name: "Disk", path: "scan", type: "NOVEL" } });
    const added = await syncLibraryBooksFromDisk(prisma, lib.id);
    expect(added.length).toBe(1);
    expect(added[0].filePath).toContain("hello.pdf");
    const again = await syncLibraryBooksFromDisk(prisma, lib.id);
    expect(again.length).toBe(0);
  });
});
