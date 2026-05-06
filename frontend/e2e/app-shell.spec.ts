import { test, expect } from "@playwright/test";

test.describe("App shell", () => {
  test("home shows dashboard branding", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Nookline/i);
    await expect(page.getByText(/Good (morning|afternoon|evening|night)/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Add a library" })).toBeVisible();
  });

  test("navigate to Settings via sidebar", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href="/settings"]').click();
    await expect(page.getByRole("heading", { name: "AI & system settings" })).toBeVisible();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("navigate to Bookmarks via sidebar", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href="/bookmarks"]').click();
    await expect(page.getByText("Bookmarks & Highlights", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/bookmarks$/);
  });

  test("Home link returns to dashboard", async ({ page }) => {
    await page.goto("/settings");
    await page.locator('aside a[href="/"]').first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/Good (morning|afternoon|evening|night)/)).toBeVisible();
  });

  test("reader route shows loading or reader chrome", async ({ page }) => {
    await page.goto("/read/1");
    const loadingOrReader = page.getByRole("progressbar").or(page.getByRole("button", { name: "Back" }));
    await expect(loadingOrReader.first()).toBeVisible({ timeout: 25_000 });
  });
});
