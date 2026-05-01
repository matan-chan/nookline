import { probeTtsSynthesis, resolveTtsTarget } from "../src/services/ttsResolve";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { rmSync } from "fs";
import { assignGlobalFetch } from "./assignGlobalFetch";
import { newTestWorkDir, runDbPush, sqliteUrlInDir } from "./testDb";

describe("resolveTtsTarget", () => {
  let prisma: PrismaClient;
  let testDir: string;

  beforeAll(async () => {
    testDir = newTestWorkDir();
    runDbPush(sqliteUrlInDir(testDir));
    prisma = new PrismaClient({ datasources: { db: { url: sqliteUrlInDir(testDir) } } });
    await prisma.$connect();
    await prisma.user.create({
      data: {
        email: "tts1@test.local",
        username: "tts1user",
        password: "x",
        ttsMode: "kokoro",
        ttsVoice: "af_test",
        ttsModel: "kokoro",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    rmSync(testDir, { recursive: true, force: true });
  });

  test("kokoro preset builds speech url", async () => {
    const t = await resolveTtsTarget(prisma, 1);
    expect(t.speechUrl).toContain("/v1/audio/speech");
    expect(t.authorization).toBeNull();
    expect(t.defaultVoice).toBe("af_test");
  });
});

describe("probeTtsSynthesis", () => {
  const orig = globalThis.fetch;
  afterAll(() => {
    globalThis.fetch = orig;
  });

  test("ok when upstream returns enough bytes", async () => {
    const buf = new Uint8Array(200).fill(1);
    assignGlobalFetch(() =>
      Promise.resolve({
        ok: true,
        headers: new Map([["content-type", "audio/mpeg"]]),
        arrayBuffer: () => Promise.resolve(buf.buffer),
      } as unknown as Response)
    );
    const r = await probeTtsSynthesis({
      speechUrl: "http://tts.test/speech",
      authorization: null,
      defaultVoice: "v",
      defaultModel: "m",
    });
    expect(r.ok).toBe(true);
    expect(r.error).toBeNull();
  });

  test("not ok on short body", async () => {
    assignGlobalFetch(() =>
      Promise.resolve({
        ok: true,
        headers: new Map([["content-type", "audio/mpeg"]]),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      } as unknown as Response)
    );
    const r = await probeTtsSynthesis({
      speechUrl: "http://tts.test/speech",
      authorization: null,
      defaultVoice: "v",
      defaultModel: "m",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("4 bytes");
  });
});
