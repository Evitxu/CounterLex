import { test, expect } from "@playwright/test";

// The debate depends on an LLM (Groq). This test is written to pass either way:
// with an LLM it shows the three agents; without one it degrades gracefully to
// the statistical consensus + a "needs an LLM" notice. CI has no LLM, so it
// exercises the fallback path.
test("debate: generates output with LLM, or degrades gracefully without one", async ({ page }) => {
  await page.goto("/debate");
  await expect(
    page.getByRole("heading", { name: /Debate jurídico multiagente/i })
  ).toBeVisible();

  await page.getByRole("button", { name: /Generar debate/i }).click();

  // The consensus/estimation is always returned, with or without an LLM.
  await expect(page.getByText(/Consenso con los precedentes/i)).toBeVisible();

  // Either the agents appear (LLM available) or the graceful fallback notice does.
  const fallback = page.getByText(/necesita un LLM/i);
  const anAgent = page.getByText(/^Fiscal$/);
  await expect(fallback.or(anAgent).first()).toBeVisible();
});