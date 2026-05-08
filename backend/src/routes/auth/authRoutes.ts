import { hashPassword, validatePasswordStrength } from "../../auth/authPassword";
import { createAuthToken, AUTH_TOKEN_TTL_MS } from "../../auth/authToken";
import { getAuthUserForRequest } from "../../auth/getAuthUserForRequest";
import { authUserJson, emailForUsername, normalizeUsername, publicUser, requireSessionUser, sendJson, USERNAME_RE, verifyPasswordWithLegacyMigration } from "./authRouteHelpers";
import { registerUserAdminRoutes } from "./authRoutesUsers";
import type { PrismaClient } from "@prisma/client";
import { Router, type Request, type Response } from "express";

const E2E_USERNAME = "playwright";

const handleBootstrap = async (prisma: PrismaClient, _req: Request, res: Response) => {
  const n = await prisma.user.count();
  const first = n === 1 ? await prisma.user.findFirst({ orderBy: { id: "asc" } }) : null;
  const legacyMigratedAccount = n === 1 && first?.username === "admin";
  sendJson(res, 200, { needsFirstUser: n === 0, legacyMigratedAccount });
};

const isE2eAccessAllowed = (req: Request) => {
  const expected = process.env.E2E_AUTH_KEY?.trim() ?? "";
  const provided = typeof req.headers["x-e2e-key"] === "string" ? String(req.headers["x-e2e-key"]) : "";
  return !expected || provided === expected;
};

const handleE2eToken = async (prisma: PrismaClient, req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  if (!isE2eAccessAllowed(req)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  const username = E2E_USERNAME;
  const email = emailForUsername(username);
  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  const u = existing ?? (await prisma.user.create({
    data: { email, username, password: await hashPassword(`Pw_${Math.random().toString(36).slice(2, 10)}!Aa1`), isAdmin: true },
  }));
  const token = createAuthToken(u.id, u.isAdmin, AUTH_TOKEN_TTL_MS);
  sendJson(res, 200, { user: authUserJson({ id: u.id, username: u.username, isAdmin: u.isAdmin, token, avatarRelPath: u.avatarRelPath }) });
};

const handleMe = async (prisma: PrismaClient, req: Request, res: Response) => {
  const u = await getAuthUserForRequest(prisma, req.headers.authorization);
  if (u == null) {
    sendJson(res, 200, { user: null });
    return;
  }
  sendJson(res, 200, { user: publicUser(u) });
};

type CredentialsBody = { username?: string; password?: string };

const validateRegisterInputs = (body: CredentialsBody) => {
  const un = typeof body.username === "string" ? normalizeUsername(body.username) : "";
  const pw = typeof body.password === "string" ? body.password : "";
  if (!USERNAME_RE.test(un)) return { error: "Invalid username. Use 2–32 letters, numbers, or underscores." };
  const strength = validatePasswordStrength(pw);
  if (!strength.ok) return { error: strength.message ?? "Invalid password" };
  return { un, pw };
};

const handleRegister = async (prisma: PrismaClient, req: Request, res: Response) => {
  const count = await prisma.user.count();
  if (count > 0) {
    sendJson(res, 403, { error: "Registration is closed. Sign in or ask an admin to add a user." });
    return;
  }
  const parsed = validateRegisterInputs(req.body as CredentialsBody);
  if ("error" in parsed) {
    sendJson(res, 400, { error: parsed.error });
    return;
  }
  const { un, pw } = parsed;
  const existing = await prisma.user.findFirst({ where: { OR: [{ username: un }, { email: emailForUsername(un) }] } });
  if (existing) {
    sendJson(res, 409, { error: "User already exists." });
    return;
  }
  const created = await prisma.user.create({
    data: { email: emailForUsername(un), username: un, password: await hashPassword(pw), isAdmin: true },
  });
  const token = createAuthToken(created.id, true, AUTH_TOKEN_TTL_MS);
  sendJson(res, 201, { user: authUserJson({ id: created.id, username: created.username, isAdmin: true, token, avatarRelPath: created.avatarRelPath }) });
};

const handleLogin = async (prisma: PrismaClient, req: Request, res: Response) => {
  const body = req.body as CredentialsBody;
  const un = typeof body.username === "string" ? normalizeUsername(body.username) : "";
  const pw = typeof body.password === "string" ? body.password : "";
  if (un.length < 2 || pw.length < 1) {
    sendJson(res, 400, { error: "Username and password required." });
    return;
  }
  const row = await prisma.user.findFirst({ where: { username: un } });
  if (row == null) {
    sendJson(res, 401, { error: "Invalid credentials." });
    return;
  }
  const ok = await verifyPasswordWithLegacyMigration(prisma, row.id, pw, row.password);
  if (!ok) {
    sendJson(res, 401, { error: "Invalid credentials." });
    return;
  }
  const token = createAuthToken(row.id, row.isAdmin, AUTH_TOKEN_TTL_MS);
  sendJson(res, 200, { user: authUserJson({ id: row.id, username: row.username, isAdmin: row.isAdmin, token, avatarRelPath: row.avatarRelPath }) });
};

const handlePasswordChange = async (prisma: PrismaClient, req: Request, res: Response) => {
  const u = await requireSessionUser(prisma, req, res);
  if (u == null) return;
  const body = req.body as { currentPassword?: string; newPassword?: string };
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";
  if (current.length < 1 || next.length < 1) {
    sendJson(res, 400, { error: "Current and new password required." });
    return;
  }
  const strength = validatePasswordStrength(next);
  if (!strength.ok) {
    sendJson(res, 400, { error: strength.message ?? "Invalid new password" });
    return;
  }
  const row = await prisma.user.findUnique({ where: { id: u.id } });
  if (row == null) {
    sendJson(res, 404, { error: "User not found" });
    return;
  }
  const ok = await verifyPasswordWithLegacyMigration(prisma, row.id, current, row.password);
  if (!ok) {
    sendJson(res, 401, { error: "Current password is incorrect." });
    return;
  }
  await prisma.user.update({ where: { id: u.id }, data: { password: await hashPassword(next) } });
  sendJson(res, 200, { ok: true });
};

export const buildAuthRouter = (prisma: PrismaClient) => {
  const r = Router();
  r.get("/bootstrap", (req, res) => void handleBootstrap(prisma, req, res));
  r.post("/e2e-token", (req, res) => void handleE2eToken(prisma, req, res));
  r.get("/me", (req, res) => void handleMe(prisma, req, res));
  r.post("/register", (req, res) => void handleRegister(prisma, req, res));
  r.post("/login", (req, res) => void handleLogin(prisma, req, res));
  r.post("/password", (req, res) => void handlePasswordChange(prisma, req, res));
  registerUserAdminRoutes(r, prisma);
  return r;
};
