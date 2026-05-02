import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export const backendRoot = join(import.meta.dir, "..");

export const runDbPush = (databaseUrl: string) => {
  const res = Bun.spawnSync(["bunx", "prisma", "db", "push", "--accept-data-loss"], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stderr: "pipe",
    stdout: "pipe",
    timeout: 120_000,
  });
  if (res.exitCode !== 0)
    throw new Error(`prisma db push failed: ${res.stderr.toString()}${res.stdout.toString()}`);
};

export const ensureTestLibraryOwnerUser = async (prisma: PrismaClient) => {
  await prisma.user.upsert({
    where: { email: "nookline-tests-library-owner@local.invalid" },
    create: {
      email: "nookline-tests-library-owner@local.invalid",
      username: "nookline-tests-library-owner",
      password: "-",
      isAdmin: false,
    },
    update: {},
  });
};

export const newTestWorkDir = () => {
  const testDir = join(tmpdir(), `nookline-test-${randomBytes(8).toString("hex")}`);
  mkdirSync(testDir, { recursive: true });
  return testDir;
};

export const sqliteUrlInDir = (testDir: string) => {
  const dbPath = join(testDir, "test.db");
  return `file:${dbPath.replace(/\\/g, "/")}`;
};
