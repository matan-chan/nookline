import { getAuthToken } from "./helpers/getAuthToken";
import { test as setup, expect } from "@playwright/test";
import { E2E_AUTH_STORAGE } from "./constants";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

setup("authenticate via API + persist session", async ({ page, request }) => {
  const apiUp = await request.get("/api/health").then((r) => r.ok()).catch(() => false);
  if (!apiUp) throw new Error("E2E auth setup failed: backend is unreachable. Start the backend (Vite proxy to DEV_BACKEND_PORT, default 4006).");

  const token = await getAuthToken(request);
  if (token == null) {
    throw new Error("E2E auth setup failed: no auth token. If registration is closed, set E2E_USERNAME and E2E_PASSWORD for an existing user.");
  }

  mkdirSync(dirname(E2E_AUTH_STORAGE), { recursive: true });

  await page.addInitScript(([t]) => localStorage.setItem("nookline_auth_token", t), [token]);
  await page.goto("/");
  await expect(page.getByText(/Good (morning|afternoon|evening|night)/)).toBeVisible({ timeout: 25_000 });

  await page.context().storageState({ path: E2E_AUTH_STORAGE });
});
