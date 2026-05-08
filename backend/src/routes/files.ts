import { registerBrandingRoutes } from "./files/filesBrandingRoutes";
import { registerAvatarRoutes } from "./files/filesAvatarRoutes";
import { registerUploadRoutes } from "./files/filesUploadRoutes";
import { registerBookFileRoutes } from "./files/filesBookRoutes";
import { beLog, beLogErr } from "../utils/beLog";
import { Router, type ErrorRequestHandler } from "express";

const router = Router();

registerUploadRoutes(router);
registerAvatarRoutes(router);
registerBookFileRoutes(router);
registerBrandingRoutes(router);

router.get("/health", (_req, res) => {
  beLog("route_files_health");
  res.json({ status: "ok" });
});

const filesErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const ne = err as NodeJS.ErrnoException & { code?: string };
  const errno = typeof ne.code === "string" ? ne.code : "";
  beLogErr("files_router", err, { path: req.path, errno });

  if (errno === "EACCES" || errno === "EROFS") {
    res.status(507).json({ error: "Upload storage is not writable. Fix UPLOAD_DIR volume permissions." });
    return;
  }

  if (errno === "ENOSPC") {
    res.status(507).json({ error: "Upload storage full." });
    return;
  }

  if ((err as Error).message === "Only .epub and .pdf files are allowed") {
    res.status(400).json({ error: "Only .epub and .pdf files are allowed" });
    return;
  }

  const lim = errno === "LIMIT_FILE_SIZE" ? "File too large" : "";
  if (lim) {
    res.status(413).json({ error: lim });
    return;
  }

  res.status(500).json({ error: "File operation failed" });
};

router.use(filesErrorHandler);

export default router;
