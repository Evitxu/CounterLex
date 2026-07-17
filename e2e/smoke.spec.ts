import { test, expect } from "@playwright/test";

// Every route renders (its <h1> is visible) — catches crashes, 404s and broken
// builds across the whole app in one sweep.
const routes = [
  "/",
  "/analyze",
  "/search",
  "/compare",
  "/debate",
  "/reports",
  "/detective",
  "/contact",
  "/dashboard",
  "/help",
];

for (const path of routes) {
  test(`route ${path} renders a heading`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(400);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).not.toBeEmpty();
  });
}