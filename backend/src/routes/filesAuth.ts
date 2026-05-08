import { getAuthUserForRequest } from "../auth/getAuthUserForRequest";
import { prisma } from "../graphql/resolverParts/prisma";
import type { Request, Response } from "express";

const getAuthHeaderOrQueryToken = (req: Request) => {
  const fromHeader = req.headers.authorization;
  if (typeof fromHeader === "string" && fromHeader.trim()) return fromHeader;
  const q = req.query.token;
  const raw = typeof q === "string" ? q.trim() : "";
  if (!raw) return undefined;
  return `Bearer ${raw}`;
};

export const requireUser = async (req: Request, res: Response) => {
  const u = await getAuthUserForRequest(prisma, req.headers.authorization);
  if (u == null) {
    res.status(401).json({ error: "Unauthenticated" });
    return null;
  }
  return u;
};

export const requireUserForCover = async (req: Request, res: Response) => {
  const u = await getAuthUserForRequest(prisma, getAuthHeaderOrQueryToken(req));
  if (u == null) {
    res.status(401).json({ error: "Unauthenticated" });
    return null;
  }
  return u;
};

export const requireAdmin = async (req: Request, res: Response) => {
  const u = await getAuthUserForRequest(prisma, req.headers.authorization);
  if (u == null) {
    res.status(401).json({ error: "Unauthenticated" });
    return null;
  }
  if (!u.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return u;
};
