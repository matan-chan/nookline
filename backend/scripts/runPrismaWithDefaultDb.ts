import { applyDefaultDatabaseUrlIfMissing } from "../src/utils/defaultDatabaseUrl";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

applyDefaultDatabaseUrlIfMissing();

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(backendRoot);

const proc = Bun.spawnSync({
  cmd: ["bunx", "prisma", ...Bun.argv.slice(2)],
  cwd: backendRoot,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
  env: process.env as Record<string, string>,
});

process.exit(proc.exitCode ?? 1);
