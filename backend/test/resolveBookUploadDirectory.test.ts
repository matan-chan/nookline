import { resolveBookUploadDirectory } from "../src/services/resolveBookUploadDirectory";
import { resolveBookFileOnDisk } from "../src/services/bookLocalFallback";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { ensureTestLibraryOwnerUser, newTestWorkDir, runDbPush, sqliteUrlInDir } from "./testDb";
import { existsSync, mkdirSync, rmSync } from "fs";
import { dirname, join, resolve } from "path";

describe("resolveBookUploadDirectory (upload saves under library folder)", () => {
  let prisma: PrismaClient;
  let testDir: string;
  let booksBase: string;
  const prevUploadDir = process.env.UPLOAD_DIR;

  beforeAll(async () => {
    testDir = newTestWorkDir();
    booksBase = join(testDir, "books-base");
    mkdirSync(booksBase, { recursive: true });
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

  test("without libraryId returns volume root (books base)", async () => {
    process.env.UPLOAD_DIR = booksBase;
    const r = await resolveBookUploadDirectory(prisma, booksBase, undefined);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(resolve(r.directory)).toBe(resolve(booksBase));
  });

  test("with library path comedy targets books-base/comedy", async () => {
    process.env.UPLOAD_DIR = booksBase;
    const lib = await prisma.library.create({
      data: { name: "Comedy", path: "comedy", type: "NOVEL" },
    });
    const r = await resolveBookUploadDirectory(prisma, booksBase, String(lib.id));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(resolve(r.directory)).toBe(resolve(booksBase, "comedy"));
    expect(existsSync(r.directory)).toBe(true);
  });

  test("with library path /comedy targets same folder as comedy", async () => {
    process.env.UPLOAD_DIR = booksBase;
    const lib = await prisma.library.create({
      data: { name: "Slash Comedy", path: "/comedy", type: "NOVEL" },
    });
    const r = await resolveBookUploadDirectory(prisma, booksBase, String(lib.id));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(resolve(r.directory)).toBe(resolve(booksBase, "comedy"));
  });

  test("upload directory is parent of resolveBookFileOnDisk for relative stored name", async () => {
    process.env.UPLOAD_DIR = booksBase;
    const lib = await prisma.library.create({
      data: { name: "Align", path: "comedy", type: "NOVEL" },
    });
    const r = await resolveBookUploadDirectory(prisma, booksBase, String(lib.id));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const absoluteBookPath = resolveBookFileOnDisk(lib.path, "1730000_a.pdf");
    expect(r.directory).toBe(dirname(absoluteBookPath));
  });

  test("invalid libraryId returns 400", async () => {
    const r = await resolveBookUploadDirectory(prisma, booksBase, "nope");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("Invalid libraryId");
  });

  test("unknown library id returns 404", async () => {
    const r = await resolveBookUploadDirectory(prisma, booksBase, "999999");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(404);
    expect(r.body.error).toBe("Library not found");
  });
});
