import { hashPassword, verifyPasswordScrypt } from "../../auth/authPassword";
import { getAuthUserForRequest } from "../../auth/getAuthUserForRequest";
import type { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";

export const USERNAME_RE = /^[a-zA-Z0-9_\p{L}]{2,32}$/u;

export const sendJson = (res: Response, code: number, body: object) => {
  res.status(code).type("json").json(body);
};

export const normalizeUsername = (s: string) => s.trim().toLowerCase();

export const emailForUsername = (u: string) => `${u}@nookline.user`;

type PublicUserInput = { id: number; username: string; isAdmin: boolean; avatarRelPath?: string | null };

export const publicUser = (u: PublicUserInput) => ({
  id: u.id,
  username: u.username,
  isAdmin: u.isAdmin,
  hasAvatar: Boolean(u.avatarRelPath),
});

type AuthUserJsonInput = PublicUserInput & { token: string };

export const authUserJson = (u: AuthUserJsonInput) => ({ ...publicUser(u), token: u.token });

export const requireSessionUser = async (prisma: PrismaClient, req: Request, res: Response) => {
  const u = await getAuthUserForRequest(prisma, req.headers.authorization);
  if (u == null) {
    sendJson(res, 401, { error: "Unauthenticated" });
    return null;
  }
  return u;
};

export const requireAdminUser = async (prisma: PrismaClient, req: Request, res: Response) => {
  const u = await requireSessionUser(prisma, req, res);
  if (u == null) return null;
  if (!u.isAdmin) {
    sendJson(res, 403, { error: "Forbidden" });
    return null;
  }
  return u;
};

export const verifyPasswordWithLegacyMigration = async (prisma: PrismaClient, userId: number, plaintext: string, storedHash: string) => {
  let ok = await verifyPasswordScrypt(plaintext, storedHash);
  if (!ok && !storedHash.startsWith("scrypt:") && storedHash === plaintext) {
    await prisma.user.update({ where: { id: userId }, data: { password: await hashPassword(plaintext) } });
    ok = true;
  }
  return ok;
};
