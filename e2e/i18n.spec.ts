import { test, expect } from "@playwright/test";

test("language switch toggles ES ↔ EN", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Análisis Jurídico Contrafactual/i })
  ).toBeVisible();

  await page.getByRole("button", { name: "English (UK)" }).click();
  await expect(
    page.getByRole("heading", { name: /Counterfactual Legal Analysis/i })
  ).toBeVisible();

  await page.getByRole("button", { name: "Español (España)" }).click();
  await expect(
    page.getByRole("heading", { name: /Análisis Jurídico Contrafactual/i })
  ).toBeVisible();
});