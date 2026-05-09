import { mkdirSync } from "fs";
import { join } from "path";
import { getUploadBaseDir } from "../../services/library/libraryPathResolve";
import { getCoverCacheDir } from "../../services/book/coverOptimization";

export const UPLOAD_DIR = getUploadBaseDir();
mkdirSync(UPLOAD_DIR, { recursive: true });
export const COVER_CACHE_DIR = getCoverCacheDir(UPLOAD_DIR);
export const BRANDING_DIR = join(UPLOAD_DIR, "branding");
export const LIBRARY_BANNER_UPLOAD_DIR = join(BRANDING_DIR, "library-banners");
export const AVATAR_DIR = join(UPLOAD_DIR, "avatars");
mkdirSync(AVATAR_DIR, { recursive: true });

export const MIME_TYPES: Record<string, string> = {
  ".epub": "application/epub+zip",
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};
