import type { PrismaClient } from "@prisma/client";
import { mkdirSync } from "fs";
import { resolveLibraryContentDir } from "./libraryPathResolve";
import { beLog } from "../utils/beLog";

export type ResolveBookUploadDirectoryResult =
  | { ok: true; directory: string }
  | { ok: false; status: number; body: { error: string } };

export const resolveBookUploadDirectory = async (
  db: PrismaClient,
  uploadDir: string,
  libraryIdQuery: unknown
): Promise<ResolveBookUploadDirectoryResult> => {
  beLog("resolveBookUploadDirectory");
  if (libraryIdQuery == null || libraryIdQuery === "") return { ok: true, directory: uploadDir };
  const raw = Array.isArray(libraryIdQuery) ? libraryIdQuery[0] : libraryIdQuery;
  const id = parseInt(String(raw), 10);
  if (!Number.isFinite(id) || id < 1) return { ok: false, status: 400, body: { error: "Invalid libraryId" } };
  const lib = await db.library.findUnique({ where: { id } });
  if (!lib) return { ok: false, status: 404, body: { error: "Library not found" } };
  const directory = resolveLibraryContentDir(uploadDir, lib.path);
  mkdirSync(directory, { recursive: true });
  return { ok: true, directory };
};
