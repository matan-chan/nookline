import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.describe("Mobile navigation", () => {
  test("menu opens and reaches Settings", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page.locator('aside a[href="/settings"]').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { name: "AI & system settings" })).toBeVisible();
  });
});
