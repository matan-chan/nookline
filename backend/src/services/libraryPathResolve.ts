import { dirname, isAbsolute, join, normalize, relative, resolve } from "path";

const COVER_CACHE_SEGMENT = ".cover-cache";

export const getUploadBaseDir = () => process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads");

export const resolveLibraryCoverCacheDir = (libraryPath: string | null | undefined): string => {
  const base = resolve(getUploadBaseDir());
  const trimmed = (libraryPath ?? "").trim();
  if (isAbsolute(trimmed)) return join(dirname(resolve(normalize(trimmed))), COVER_CACHE_SEGMENT);
  return join(base, COVER_CACHE_SEGMENT);
};

export const resolveLibraryContentDir = (uploadDir: string, libraryPath: string | null | undefined): string => {
  const trimmed = (libraryPath ?? "").trim();
  const base = resolve(uploadDir);
  if (!trimmed) return base;
  const segments = trimmed.split(/[/\\]+/).filter(Boolean);
  const isSingleSegmentFromRootStyle = segments.length === 1 && /^[/\\]/.test(trimmed);
  if (isSingleSegmentFromRootStyle) {
    const dest = resolve(base, segments[0]);
    const rel = relative(base, dest);
    if (!rel.startsWith("..")) return dest;
  }
  if (isAbsolute(trimmed)) return resolve(normalize(trimmed));
  const dest = resolve(base, trimmed);
  const rel = relative(base, dest);
  if (rel.startsWith("..")) return base;
  return dest;
};
