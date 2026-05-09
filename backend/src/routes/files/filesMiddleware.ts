import { resolveBookUploadDirectory } from "../../services/book/resolveBookUploadDirectory";
import { prisma } from "../../graphql/resolverParts/prisma";
import { beLog, beLogErr } from "../../utils/beLog";
import type { UploadRequest } from "./filesMulter";
import { UPLOAD_DIR } from "./filesConstants";
import { NextFunction, Response } from "express";

export const resolveUploadDestination = async (req: UploadRequest, res: Response, next: NextFunction) => {
  try {
    beLog("resolveUploadDestination");
    const result = await resolveBookUploadDirectory(prisma, UPLOAD_DIR, req.query.libraryId);
    if (!result.ok) {
      beLog("resolveUploadDestination", { ok: false, status: result.status });
      res.status(result.status).json(result.body);
      return;
    }
    req.uploadDestOverride = result.directory;
    next();
  } catch (e) {
    beLogErr("resolveUploadDestination", e);
    if (!res.headersSent) res.status(503).json({ error: "Upload setup failed" });
  }
};
