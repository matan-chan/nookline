import { existsSync } from "fs";
import { join } from "path";

export const resolveDefaultSqliteDatabaseUrl = () =>
  existsSync("/.dockerenv") && existsSync("/data")
    ? "file:/data/app.db"
    : `file:${join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/")}`;

export const applyDefaultDatabaseUrlIfMissing = () => {
  if (typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim()) return;
  process.env.DATABASE_URL = resolveDefaultSqliteDatabaseUrl();
};
