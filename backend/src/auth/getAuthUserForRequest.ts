import type { PrismaClient, User } from "@prisma/client";
import { verifyAuthToken } from "./authToken";

const bearer = (authHeader: string | undefined) => {
  if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
};

export const getAuthUserForRequest = async (
  prisma: PrismaClient,
  authHeader: string | undefined,
): Promise<Pick<User, "id" | "username" | "isAdmin" | "avatarRelPath"> | null> => {
  const raw = bearer(authHeader);
  const t = raw ? verifyAuthToken(raw) : null;
  if (t == null) return null;
  const u = await prisma.user.findUnique({
    where: { id: t.sub },
    select: { id: true, username: true, isAdmin: true, avatarRelPath: true },
  });
  if (u == null) return null;
  if (u.isAdmin !== t.adm) return null;
  return u;
};
