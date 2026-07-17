import { test, expect } from "@playwright/test";

test("contact form: rejects a bad email, then submits successfully", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: /Contacta conmigo/i })).toBeVisible();

  const name = page.getByPlaceholder("p. ej. Ana", { exact: true });
  const surname = page.getByPlaceholder("p. ej. García López", { exact: true });
  const email = page.getByPlaceholder("p. ej. ana@ejemplo.com", { exact: true });
  const obs = page.getByPlaceholder("Escribe aquí tu mensaje…", { exact: true });

  await name.fill("Ana");
  await surname.fill("García López");
  await email.fill("not-an-email");
  await obs.fill("Mensaje de prueba E2E."); // moving focus here blurs the email field

  // Invalid email → inline error, and the submit button stays disabled.
  await expect(page.getByText(/email válido/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Enviar mensaje/i })).toBeDisabled();

  // Fix the email → button enables → submit → success message.
  await email.fill("ana@example.com");
  await obs.click(); // blur email so validation re-runs
  const submit = page.getByRole("button", { name: /Enviar mensaje/i });
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.getByText(/recibido y guardado|Mensaje enviado/i)).toBeVisible();
});