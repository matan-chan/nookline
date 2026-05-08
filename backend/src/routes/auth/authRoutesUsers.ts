import { hashPassword, validatePasswordStrength } from "../../auth/authPassword";
import { UPLOAD_DIR } from "../files/filesConstants";
import { emailForUsername, normalizeUsername, publicUser, requireAdminUser, sendJson, USERNAME_RE } from "./authRouteHelpers";
import type { PrismaClient } from "@prisma/client";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import type { Request, Response, Router } from "express";

const handleListUsers = async (prisma: PrismaClient, req: Request, res: Response) => {
  if ((await requireAdminUser(prisma, req, res)) == null) return;
  const list = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, username: true, isAdmin: true, createdAt: true, avatarRelPath: true },
  });
  sendJson(res, 200, {
    users: list.map((x) => ({
      ...publicUser(x),
      createdAt: x.createdAt.toISOString(),
    })),
  });
};

type CreateUserBody = { username?: string; password?: string; isAdmin?: boolean };

const handleCreateUser = async (prisma: PrismaClient, req: Request, res: Response) => {
  if ((await requireAdminUser(prisma, req, res)) == null) return;
  const body = req.body as CreateUserBody;
  const un = typeof body.username === "string" ? normalizeUsername(body.username) : "";
  const pw = typeof body.password === "string" ? body.password : "";
  const isAdmin = body.isAdmin === true;
  if (!USERNAME_RE.test(un)) {
    sendJson(res, 400, { error: "Invalid username. Use 2–32 letters, numbers, or underscores." });
    return;
  }
  const strength = validatePasswordStrength(pw);
  if (!strength.ok) {
    sendJson(res, 400, { error: strength.message ?? "Invalid password" });
    return;
  }
  const existing = await prisma.user.findFirst({ where: { OR: [{ username: un }, { email: emailForUsername(un) }] } });
  if (existing) {
    sendJson(res, 409, { error: "User already exists." });
    return;
  }
  const created = await prisma.user.create({
    data: { email: emailForUsername(un), username: un, password: await hashPassword(pw), isAdmin },
  });
  sendJson(res, 201, { id: created.id, username: created.username, isAdmin: created.isAdmin });
};

const tryRemoveAvatarFile = (relPath: string | null) => {
  if (!relPath) return;
  const abs = join(UPLOAD_DIR, relPath);
  if (!existsSync(abs)) return;
  try {
    unlinkSync(abs);
  } catch {
    /* best-effort */
  }
};

const handleDeleteUser = async (prisma: PrismaClient, req: Request, res: Response) => {
  const session = await requireAdminUser(prisma, req, res);
  if (session == null) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id) || id < 1) {
    sendJson(res, 400, { error: "Invalid user id" });
    return;
  }
  if (id === session.id) {
    sendJson(res, 400, { error: "You cannot delete your own account" });
    return;
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (target == null) {
    sendJson(res, 404, { error: "User not found" });
    return;
  }
  if (target.isAdmin) {
    const adminCount = await prisma.user.count({ where: { isAdmin: true } });
    if (adminCount <= 1) {
      sendJson(res, 400, { error: "Cannot delete the only administrator" });
      return;
    }
  }
  tryRemoveAvatarFile(target.avatarRelPath);
  await prisma.user.delete({ where: { id } });
  res.status(204).end();
};

export const registerUserAdminRoutes = (r: Router, prisma: PrismaClient) => {
  r.get("/users", (req, res) => void handleListUsers(prisma, req, res));
  r.post("/users", (req, res) => void handleCreateUser(prisma, req, res));
  r.delete("/users/:id", (req, res) => void handleDeleteUser(prisma, req, res));
};
