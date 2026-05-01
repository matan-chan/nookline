import { getCoverCacheDir, streamRawImage } from "../src/services/coverOptimization";
import { describe, expect, test } from "bun:test";
import { rmSync, writeFileSync } from "fs";
import { newTestWorkDir } from "./testDb";
import type { Response } from "express";
import { PassThrough } from "stream";
import { join } from "path";

describe("getCoverCacheDir", () => {
  test("appends cover cache folder", () => {
    expect(getCoverCacheDir("/data/books")).toBe(join("/data/books", ".cover-cache"));
  });
});

describe("streamRawImage", () => {
  test("streams file bytes", async () => {
    const dir = newTestWorkDir();
    try {
      const img = join(dir, "x.jpg");
      writeFileSync(img, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]));
      const dest = new PassThrough();
      const chunks: Buffer[] = [];
      dest.on("data", (c: Buffer) => chunks.push(c));
      const res = Object.assign(dest, { setHeader: () => {} }) as unknown as Response;
      streamRawImage(res, img, "image/jpeg");
      await new Promise<void>((resolve, reject) => {
        dest.on("end", resolve);
        dest.on("error", reject);
      });
      expect(Buffer.concat(chunks).length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
