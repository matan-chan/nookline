import { extractEpubCoverWebp, tryGenerateCoverWebp } from "../src/services/book/bookCoverFromFile";
import { describe, expect, test } from "bun:test";
import { rmSync } from "fs";
import { join } from "path";
import { newTestWorkDir } from "./testDb";

describe("tryGenerateCoverWebp", () => {
  test("returns false for missing file", async () => {
    const dir = newTestWorkDir();
    try {
      const out = join(dir, "o.webp");
      const ok = await tryGenerateCoverWebp(join(dir, "missing.pdf"), ".pdf", out);
      expect(ok).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("extractEpubCoverWebp", () => {
  test("returns false for missing epub", async () => {
    const dir = newTestWorkDir();
    try {
      const ok = await extractEpubCoverWebp(join(dir, "nope.epub"), join(dir, "o.webp"));
      expect(ok).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
