import { Router } from "express";
import { beLog } from "../utils/beLog";
import { registerUploadRoutes } from "./filesUploadRoutes";
import { registerAvatarRoutes } from "./filesAvatarRoutes";
import { registerBookFileRoutes } from "./filesBookRoutes";
import { registerBrandingRoutes } from "./filesBrandingRoutes";

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
