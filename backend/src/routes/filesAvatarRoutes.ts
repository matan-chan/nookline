import { existsSync, renameSync, unlinkSync, createReadStream } from "fs";
import { extname, join, relative } from "path";
import { Router, Request, Response } from "express";
import { prisma } from "../graphql/resolverParts/prisma";
import { beLog } from "../utils/beLog";
import { AVATAR_DIR, MIME_TYPES, UPLOAD_DIR } from "./filesConstants";
import { avatarUpload } from "./filesMulter";
import { requireAdmin, requireUser } from "./filesAuth";

const ALLOWED_AVATAR_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

const tryUnlink = (abs: string) => {
  try {
    unlinkSync(abs);
  } catch {
    /* best-effort */
  }
};

const streamUserAvatar = (res: Response, relPath: string) => {
  const abs = join(UPLOAD_DIR, relPath);
  if (!existsSync(abs)) {
    res.status(404).end();
    return;
  }
  const ext = extname(abs).toLowerCase();
  res.setHeader("Content-Type", MIME_TYPES[ext] ?? "application/octet-stream");
  res.setHeader("Cache-Control", "private, no-cache");
  createReadStream(abs).pipe(res);
};

const handleGetMyAvatar = async (req: Request, res: Response) => {
  beLog("route_get_avatar_me");
  const u = await requireUser(req, res);
  if (u == null) return;
  if (!u.avatarRelPath) {
    res.status(404).end();
    return;
  }
  streamUserAvatar(res, u.avatarRelPath);
};

const handleGetUserAvatar = async (req: Request, res: Response) => {
  beLog("route_get_avatar_user");
  const admin = await requireAdmin(req, res);
  if (admin == null) return;
  const userId = parseInt(String(req.params.userId), 10);
  if (!Number.isFinite(userId) || userId < 1) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { avatarRelPath: true } });
  if (row?.avatarRelPath == null || row.avatarRelPath === "") {
    res.status(404).end();
    return;
  }
  streamUserAvatar(res, row.avatarRelPath);
};

const removePreviousAvatar = async (userId: number, finalAbs: string) => {
  const prev = await prisma.user.findUnique({ where: { id: userId }, select: { avatarRelPath: true } });
  if (!prev?.avatarRelPath) return;
  const oldAbs = join(UPLOAD_DIR, prev.avatarRelPath);
  if (oldAbs !== finalAbs && existsSync(oldAbs)) tryUnlink(oldAbs);
};

const handlePostAvatar = async (req: Request, res: Response) => {
  beLog("route_post_avatar");
  const u = await requireUser(req, res);
  if (u == null) return;
  if (!req.file) {
    res.status(400).json({ error: "No file received" });
    return;
  }
  const ext = extname(req.file.originalname).toLowerCase() || ".jpg";
  if (!ALLOWED_AVATAR_EXTS.includes(ext)) {
    res.status(400).json({ error: "Invalid image type" });
    return;
  }
  const finalAbs = join(AVATAR_DIR, `user-${u.id}${ext}`);
  await removePreviousAvatar(u.id, finalAbs);
  if (existsSync(finalAbs) && finalAbs !== req.file.path) tryUnlink(finalAbs);
  try {
    renameSync(req.file.path, finalAbs);
  } catch (e) {
    beLog("route_post_avatar_rename_fail", { err: String(e) });
    res.status(500).json({ error: "Failed to store avatar" });
    return;
  }
  const relPath = relative(UPLOAD_DIR, finalAbs).replace(/\\/g, "/");
  await prisma.user.update({ where: { id: u.id }, data: { avatarRelPath: relPath } });
  res.json({ ok: true, hasAvatar: true });
};

const handleDeleteAvatar = async (req: Request, res: Response) => {
  beLog("route_delete_avatar");
  const u = await requireUser(req, res);
  if (u == null) return;
  const row = await prisma.user.findUnique({ where: { id: u.id }, select: { avatarRelPath: true } });
  if (row?.avatarRelPath) {
    const oldAbs = join(UPLOAD_DIR, row.avatarRelPath);
    await prisma.user.update({ where: { id: u.id }, data: { avatarRelPath: null } });
    if (existsSync(oldAbs)) tryUnlink(oldAbs);
  }
  res.status(204).end();
};

export const registerAvatarRoutes = (router: Router) => {
  router.get("/avatar/me", handleGetMyAvatar);
  router.get("/avatar/user/:userId", handleGetUserAvatar);
  router.post("/avatar", avatarUpload.single("file"), handlePostAvatar);
  router.delete("/avatar", handleDeleteAvatar);
};
