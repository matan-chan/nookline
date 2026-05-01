import { Response, NextFunction } from "express";
import { prisma } from "../graphql/resolverParts/prisma";
import { resolveBookUploadDirectory } from "../services/resolveBookUploadDirectory";
import { beLog } from "../utils/beLog";
import { UPLOAD_DIR } from "./filesConstants";
import type { UploadRequest } from "./filesMulter";

export const resolveUploadDestination = async (req: UploadRequest, res: Response, next: NextFunction) => {
  beLog("resolveUploadDestination");
  const result = await resolveBookUploadDirectory(prisma, UPLOAD_DIR, req.query.libraryId);
  if (!result.ok) {
    beLog("resolveUploadDestination", { ok: false, status: result.status });
    res.status(result.status).json(result.body);
    return;
  }
  req.uploadDestOverride = result.directory;
  next();
};
