import { test, expect } from "@playwright/test";

const bodyBg = () =>
  document.defaultView!.getComputedStyle(document.body).backgroundColor;

test("dark-mode toggle switches theme, restyles the page, and persists", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");

  const initial = await html.getAttribute("data-theme");
  expect(["light", "dark"]).toContain(initial);
  const bgBefore = await page.evaluate(bodyBg);

  await page.getByRole("button", { name: /tema|theme/i }).click();
  const toggled = await html.getAttribute("data-theme");
  expect(toggled).not.toBe(initial);

  // The tokens actually re-style the page (body background changes).
  const bgAfter = await page.evaluate(bodyBg);
  expect(bgAfter).not.toBe(bgBefore);

  // Choice persists after a reload (localStorage + pre-paint script).
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", toggled!);
});
