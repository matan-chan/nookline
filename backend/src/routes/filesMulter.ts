import { extname } from "path";
import { mkdirSync } from "fs";
import multer from "multer";
import { beLog } from "../utils/beLog";
import { AVATAR_DIR, BRANDING_DIR, LIBRARY_BANNER_UPLOAD_DIR, UPLOAD_DIR } from "./filesConstants";

export type UploadRequest = import("express").Request & { uploadDestOverride?: string };

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    beLog("multer_disk_destination");
    const dest = (req as UploadRequest).uploadDestOverride ?? UPLOAD_DIR;
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    beLog("multer_disk_filename", { original: file.originalname.slice(0, 120) });
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${ts}_${safe}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".epub", ".pdf"];
    const ext = extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      beLog("multer_file_filter", { ext, ok: true });
      return cb(null, true);
    }
    beLog("multer_file_filter", { ext, ok: false });
    cb(new Error("Only .epub and .pdf files are allowed"));
  },
});

export const faviconUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _f, cb) => {
      mkdirSync(BRANDING_DIR, { recursive: true });
      cb(null, BRANDING_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `favicon${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if ([".ico", ".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) return cb(null, true);
    cb(new Error("Invalid favicon type"));
  },
});

export const libraryBannerBrandingUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _f, cb) => {
      mkdirSync(LIBRARY_BANNER_UPLOAD_DIR, { recursive: true });
      cb(null, LIBRARY_BANNER_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 9)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return cb(null, true);
    cb(new Error("Only .png, .jpg, .jpeg, .webp allowed for library banners"));
  },
});

export const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _f, cb) => {
      mkdirSync(AVATAR_DIR, { recursive: true });
      cb(null, AVATAR_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return cb(null, true);
    cb(new Error("Only .png, .jpg, .jpeg, .webp allowed for avatars"));
  },
});
