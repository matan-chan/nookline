import { Router } from "express";
import { beLog } from "../utils/beLog";
import { registerUploadRoutes } from "./files/filesUploadRoutes";
import { registerAvatarRoutes } from "./files/filesAvatarRoutes";
import { registerBookFileRoutes } from "./files/filesBookRoutes";
import { registerBrandingRoutes } from "./files/filesBrandingRoutes";

const router = Router();

registerUploadRoutes(router);
registerAvatarRoutes(router);
registerBookFileRoutes(router);
registerBrandingRoutes(router);

router.get("/health", (_req, res) => {
  beLog("route_files_health");
  res.json({ status: "ok" });
});

export default router;
