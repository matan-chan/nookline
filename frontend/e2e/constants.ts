import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));

export const E2E_AUTH_STORAGE = "playwright/.auth/user.json";
export const E2E_DEFAULT_PDF_PATH = path.join(e2eDir, "fixtures", "peter-pan.pdf");
