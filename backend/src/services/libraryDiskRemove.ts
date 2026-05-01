import { existsSync, rmSync, statSync } from "fs";
import { relative, resolve } from "path";
import { getUploadBaseDir, resolveLibraryContentDir } from "./libraryPathResolve";
import { beLog, beLogErr } from "../utils/beLog";

export const removeLibraryDiskFolderIfSafe = (libraryPath: string | null | undefined) => {
  const trimmed = (libraryPath ?? "").trim();
  if (!trimmed) return;
  const base = resolve(getUploadBaseDir());
  const root = resolve(resolveLibraryContentDir(getUploadBaseDir(), libraryPath));
  if (!existsSync(root)) return;
  let isDir = false;
  try {
    isDir = statSync(root).isDirectory();
  } catch (e) {
    beLogErr("removeLibraryDiskFolderIfSafe_stat", e, { root: root.slice(0, 200) });
    return;
  }
  if (!isDir) return;
  const rel = relative(base, root);
  if (!rel || root === base || rel.startsWith("..")) return;
  try {
    beLog("removeLibraryDiskFolderIfSafe", { root });
    rmSync(root, { recursive: true, force: true });
  } catch (e) {
    beLogErr("removeLibraryDiskFolderIfSafe_rm", e, { root: root.slice(0, 200) });
  }
};
