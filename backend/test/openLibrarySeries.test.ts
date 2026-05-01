import {
  findOrCreateSeriesByTitle,
  resolveSeriesFromIsbns,
  resolveSeriesFromWorkKey,
  seriesInfoFromWorkJson,
} from "../src/services/openLibrarySeries";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { rmSync } from "fs";
import { assignGlobalFetch } from "./assignGlobalFetch";
import { newTestWorkDir, runDbPush, sqliteUrlInDir } from "./testDb";

describe("openLibrarySeries", () => {
  let prisma: PrismaClient;
  let testDir: string;
  const origFetch = globalThis.fetch;

  beforeAll(async () => {
    testDir = newTestWorkDir();
    runDbPush(sqliteUrlInDir(testDir));
    prisma = new PrismaClient({ datasources: { db: { url: sqliteUrlInDir(testDir) } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    globalThis.fetch = origFetch;
    await prisma.$disconnect();
    rmSync(testDir, { recursive: true, force: true });
  });

  test("findOrCreateSeriesByTitle creates then returns existing", async () => {
    const lib = await prisma.library.create({ data: { name: "L", path: ".", type: "NOVEL" } });
    const a = await findOrCreateSeriesByTitle(prisma, lib.id, "Saga");
    const b = await findOrCreateSeriesByTitle(prisma, lib.id, "Saga");
    expect(a.id).toBe(b.id);
  });

  test("resolveSeriesFromWorkKey returns null for non-work key", async () => {
    expect(await resolveSeriesFromWorkKey("/books/OL1M")).toBeNull();
  });

  test("resolveSeriesFromWorkKey parses work json when fetch returns series", async () => {
    assignGlobalFetch(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            series: [{ name: "Wheel", position: "2" }],
          }),
      } as Response)
    );
    const out = await resolveSeriesFromWorkKey("/works/OL1W");
    expect(out).toEqual({ title: "Wheel", volume: 2 });
  });

  test("seriesInfoFromWorkJson returns null for empty input", async () => {
    expect(await seriesInfoFromWorkJson(null)).toBeNull();
  });

  test("seriesInfoFromWorkJson reads embedded series name", async () => {
    const out = await seriesInfoFromWorkJson({
      series: [{ name: "Inner", volume: 1 }],
    });
    expect(out).toEqual({ title: "Inner", volume: 1 });
  });

  test("resolveSeriesFromIsbns returns null when fetch yields nothing", async () => {
    assignGlobalFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response));
    expect(await resolveSeriesFromIsbns(["9780000000000"])).toBeNull();
  });

  test("resolveSeriesFromIsbns reads books api row", async () => {
    assignGlobalFetch(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            "ISBN:9781234567890": {
              series: [{ name: "ISBN Series", volume: "3" }],
            },
          }),
      } as Response)
    );
    const out = await resolveSeriesFromIsbns(["978-1234567890"]);
    expect(out).toEqual({ title: "ISBN Series", volume: 3 });
  });
});
