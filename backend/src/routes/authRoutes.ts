import { hashPassword, validatePasswordStrength, verifyPasswordScrypt } from "../auth/authPassword";
import { createAuthToken, AUTH_TOKEN_TTL_MS } from "../auth/authToken";
import { getAuthUserForRequest } from "../auth/getAuthUserForRequest";
import { UPLOAD_DIR } from "./filesConstants";
import type { PrismaClient } from "@prisma/client";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { Router, type Request, type Response } from "express";

const USERNAME_RE = /^[a-zA-Z0-9_\p{L}]{2,32}$/u;

const json = (res: Response, code: number, body: object) => {
  res.status(code).type("json").json(body);
};

const normalizeUsername = (s: string) => s.trim().toLowerCase();

const emailForUsername = (u: string) => `${u}@nookline.user`;

const publicUser = (u: { id: number; username: string; isAdmin: boolean; avatarRelPath?: string | null }) => ({
  id: u.id,
  username: u.username,
  isAdmin: u.isAdmin,
  hasAvatar: Boolean(u.avatarRelPath),
});

const authUserJson = (u: { id: number; username: string; isAdmin: boolean; token: string; avatarRelPath?: string | null }) => ({
  ...publicUser(u),
  token: u.token,
});

export const buildAuthRouter = (prisma: PrismaClient) => {
  const r = Router();

  r.get("/bootstrap", async (_req: Request, res: Response) => {
    const n = await prisma.user.count();
    const first = n === 1 ? await prisma.user.findFirst({ orderBy: { id: "asc" } }) : null;
    const legacyMigratedAccount = n === 1 && first?.username === "admin";
    json(res, 200, { needsFirstUser: n === 0, legacyMigratedAccount });
  });

  r.post("/e2e-token", async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") {
      json(res, 404, { error: "Not found" });
      return;
    }

    const expected = process.env.E2E_AUTH_KEY?.trim() ?? "";
    const provided = typeof req.headers["x-e2e-key"] === "string" ? String(req.headers["x-e2e-key"]) : "";
    if (expected && provided !== expected) {
      json(res, 403, { error: "Forbidden" });
      return;
    }

    const username = "playwright";
    const email = emailForUsername(username);
    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    const u =
      existing ??
      (await prisma.user.create({
        data: {
          email,
          username,
          password: await hashPassword(`Pw_${Math.random().toString(36).slice(2, 10)}!Aa1`),
          isAdmin: true,
        },
      }));

    const token = createAuthToken(u.id, u.isAdmin, AUTH_TOKEN_TTL_MS);
    json(res, 200, {
      user: authUserJson({ id: u.id, username: u.username, isAdmin: u.isAdmin, token, avatarRelPath: u.avatarRelPath }),
    });
  });

  r.get("/me", async (req: Request, res: Response) => {
    const u = await getAuthUserForRequest(prisma, req.headers.authorization);
    if (u == null) {
      json(res, 200, { user: null });
      return;
    }
    json(res, 200, { user: publicUser(u) });
  });

  r.post("/register", async (req: Request, res: Response) => {
    const count = await prisma.user.count();
    if (count > 0) {
      json(res, 403, { error: "Registration is closed. Sign in or ask an admin to add a user." });
      return;
    }
    const body = req.body as { username?: string; password?: string };
    const un = typeof body.username === "string" ? normalizeUsername(body.username) : "";
    const pw = typeof body.password === "string" ? body.password : "";
    if (!USERNAME_RE.test(un)) {
      json(res, 400, { error: "Invalid username. Use 2–32 letters, numbers, or underscores." });
      return;
    }
    const strength = validatePasswordStrength(pw);
    if (!strength.ok) {
      json(res, 400, { error: strength.message ?? "Invalid password" });
      return;
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: un }, { email: emailForUsername(un) }] },
    });
    if (existing) {
      json(res, 409, { error: "User already exists." });
      return;
    }
    const created = await prisma.user.create({
      data: {
        email: emailForUsername(un),
        username: un,
        password: await hashPassword(pw),
        isAdmin: true,
      },
    });
    const token = createAuthToken(created.id, true, AUTH_TOKEN_TTL_MS);
    json(res, 201, {
      user: authUserJson({
        id: created.id,
        username: created.username,
        isAdmin: true,
        token,
        avatarRelPath: created.avatarRelPath,
      }),
    });
  });

  r.post("/login", async (req: Request, res: Response) => {
    const body = req.body as { username?: string; password?: string };
    const un = typeof body.username === "string" ? normalizeUsername(body.username) : "";
    const pw = typeof body.password === "string" ? body.password : "";
    if (un.length < 2 || pw.length < 1) {
      json(res, 400, { error: "Username and password required." });
      return;
    }
    const row = await prisma.user.findFirst({ where: { username: un } });
    if (row == null) {
      json(res, 401, { error: "Invalid credentials." });
      return;
    }
    let ok = await verifyPasswordScrypt(pw, row.password);
    if (!ok && !row.password.startsWith("scrypt:") && row.password === pw) {
      await prisma.user.update({ where: { id: row.id }, data: { password: await hashPassword(pw) } });
      ok = true;
    }
    if (!ok) {
      json(res, 401, { error: "Invalid credentials." });
      return;
    }
    const token = createAuthToken(row.id, row.isAdmin, AUTH_TOKEN_TTL_MS);
    json(res, 200, {
      user: authUserJson({ id: row.id, username: row.username, isAdmin: row.isAdmin, token, avatarRelPath: row.avatarRelPath }),
    });
  });

  r.post("/password", async (req: Request, res: Response) => {
    const u = await getAuthUserForRequest(prisma, req.headers.authorization);
    if (u == null) {
      json(res, 401, { error: "Unauthenticated" });
      return;
    }
    const body = req.body as { currentPassword?: string; newPassword?: string };
    const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const next = typeof body.newPassword === "string" ? body.newPassword : "";
    if (current.length < 1 || next.length < 1) {
      json(res, 400, { error: "Current and new password required." });
      return;
    }
    const strength = validatePasswordStrength(next);
    if (!strength.ok) {
      json(res, 400, { error: strength.message ?? "Invalid new password" });
      return;
    }
    const row = await prisma.user.findUnique({ where: { id: u.id } });
    if (row == null) {
      json(res, 404, { error: "User not found" });
      return;
    }
    let ok = await verifyPasswordScrypt(current, row.password);
    if (!ok && !row.password.startsWith("scrypt:") && row.password === current) ok = true;
    if (!ok) {
      json(res, 401, { error: "Current password is incorrect." });
      return;
    }
    await prisma.user.update({ where: { id: u.id }, data: { password: await hashPassword(next) } });
    json(res, 200, { ok: true });
  });

  r.get("/users", async (req: Request, res: Response) => {
    const u = await getAuthUserForRequest(prisma, req.headers.authorization);
    if (u == null) {
      json(res, 401, { error: "Unauthenticated" });
      return;
    }
    if (!u.isAdmin) {
      json(res, 403, { error: "Forbidden" });
      return;
    }
    const list = await prisma.user.findMany({
      orderBy: { id: "asc" },
      select: { id: true, username: true, isAdmin: true, createdAt: true },
    });
    json(res, 200, { users: list.map((x) => ({ id: x.id, username: x.username, isAdmin: x.isAdmin, createdAt: x.createdAt.toISOString() })) });
  });

  r.post("/users", async (req: Request, res: Response) => {
    const admin = await getAuthUserForRequest(prisma, req.headers.authorization);
    if (admin == null) {
      json(res, 401, { error: "Unauthenticated" });
      return;
    }
    if (!admin.isAdmin) {
      json(res, 403, { error: "Forbidden" });
      return;
    }
    const body = req.body as { username?: string; password?: string; isAdmin?: boolean };
    const un = typeof body.username === "string" ? normalizeUsername(body.username) : "";
    const pw = typeof body.password === "string" ? body.password : "";
    const isAdmin = body.isAdmin === true;
    if (!USERNAME_RE.test(un)) {
      json(res, 400, { error: "Invalid username. Use 2–32 letters, numbers, or underscores." });
      return;
    }
    const strength = validatePasswordStrength(pw);
    if (!strength.ok) {
      json(res, 400, { error: strength.message ?? "Invalid password" });
      return;
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: un }, { email: emailForUsername(un) }] },
    });
    if (existing) {
      json(res, 409, { error: "User already exists." });
      return;
    }
    const created = await prisma.user.create({
      data: {
        email: emailForUsername(un),
        username: un,
        password: await hashPassword(pw),
        isAdmin,
      },
    });
    json(res, 201, { id: created.id, username: created.username, isAdmin: created.isAdmin });
  });

  r.delete("/users/:id", async (req: Request, res: Response) => {
    const session = await getAuthUserForRequest(prisma, req.headers.authorization);
    if (session == null) {
      json(res, 401, { error: "Unauthenticated" });
      return;
    }
    if (!session.isAdmin) {
      json(res, 403, { error: "Forbidden" });
      return;
    }
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id) || id < 1) {
      json(res, 400, { error: "Invalid user id" });
      return;
    }
    if (id === session.id) {
      json(res, 400, { error: "You cannot delete your own account" });
      return;
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (target == null) {
      json(res, 404, { error: "User not found" });
      return;
    }
    if (target.isAdmin) {
      const adminCount = await prisma.user.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        json(res, 400, { error: "Cannot delete the only administrator" });
        return;
      }
    }
    if (target.avatarRelPath) {
      const abs = join(UPLOAD_DIR, target.avatarRelPath);
      if (existsSync(abs))
        try {
          unlinkSync(abs);
        } catch {
          /* best-effort */
        }
    }
    await prisma.user.delete({ where: { id } });
    res.status(204).end();
  });

  return r;
};
