import { getUploadBaseDir, resolveLibraryContentDir } from "../src/services/library/libraryPathResolve";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { newTestWorkDir } from "./testDb";

describe("libraryPathResolve", () => {
  const prev = process.env.UPLOAD_DIR;
  afterEach(() => {
    if (prev === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = prev;
  });

  test("getUploadBaseDir resolves UPLOAD_DIR override when set (advanced/tests)", () => {
    process.env.UPLOAD_DIR = "D:\\books";
    expect(getUploadBaseDir()).toBe("D:\\books");
  });

  test("resolveLibraryContentDir empty path returns base", () => {
    const base = join(newTestWorkDir(), "u");
    mkdirSync(base, { recursive: true });
    try {
      expect(resolveLibraryContentDir(base, "")).toBe(join(base));
      expect(resolveLibraryContentDir(base, "   ")).toBe(join(base));
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("resolveLibraryContentDir relative segment under base", () => {
    const base = join(newTestWorkDir(), "vol");
    mkdirSync(base, { recursive: true });
    try {
      expect(resolveLibraryContentDir(base, "comedy")).toBe(join(base, "comedy"));
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("resolveLibraryContentDir single leading slash segment under base", () => {
    const base = join(newTestWorkDir(), "vol2");
    mkdirSync(base, { recursive: true });
    try {
      expect(resolveLibraryContentDir(base, "/comedy")).toBe(join(base, "comedy"));
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
