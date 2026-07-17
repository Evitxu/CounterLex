import { test, expect } from "@playwright/test";

test("dashboard loads KPI tiles from the API", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Panel de métricas/i })).toBeVisible();

  // Tiles are populated from GET /stats — a model metric and a corpus metric.
  await expect(page.getByText(/Precisión \(test\)/i)).toBeVisible();
  await expect(page.getByText(/Casos totales/i)).toBeVisible();
});