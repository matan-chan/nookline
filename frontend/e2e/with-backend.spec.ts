import { test, expect } from "@playwright/test";

let apiUp = false;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/health").catch(() => null);
  apiUp = res?.ok() ?? false;
});

test.describe("When API is reachable (Vite proxy → backend)", () => {
  test("GET /api/health returns 200", async ({ request }) => {
    test.skip(!apiUp, "Start the backend on the port in .env DEV_BACKEND_PORT (Vite default proxy 4006).");
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
  });

  test("invalid book id shows not found copy", async ({ page }) => {
    test.skip(!apiUp, "Start the backend on the port in .env DEV_BACKEND_PORT (Vite default proxy 4006).");
    await page.goto("/book/999999999");
    await expect(page.getByText("Book not found.", { exact: true })).toBeVisible({ timeout: 20_000 });
  });
});
