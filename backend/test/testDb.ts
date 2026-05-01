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
  });
  if (res.exitCode !== 0)
    throw new Error(`prisma db push failed: ${res.stderr.toString()}${res.stdout.toString()}`);
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
