import { test, expect } from "@playwright/test";

test("counterfactual home: example → analyze produces a prediction", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Análisis Jurídico Contrafactual/i })
  ).toBeVisible();

  // Fill the case box with the built-in example, then analyze.
  await page.getByRole("button", { name: /^Ejemplo$/i }).click();
  await page.getByRole("button", { name: /Analizar caso/i }).click();

  // The extraction-source badge appears once the analysis returns…
  await expect(page.getByText(/extracci/i)).toBeVisible();
  // …and a probability percentage is rendered (gauge).
  await expect(page.getByText(/%/).first()).toBeVisible();
});