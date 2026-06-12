/**
 * Tests de Settings — perfil carga, tabs, webhook URL.
 *
 * El mock API devuelve perfil: { business_name: "Comercio de Prueba", email: "comercio@test.com", ruc: "1234567890001" }
 * PUT /v1/auth/webhook devuelve perfil actualizado.
 */

import { test, expect } from "@playwright/test";
import { setAuthCookie } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setAuthCookie(context);
});

// ── S1: Página de settings carga con email del merchant ──────────────────────

test("settings page loads with merchant email", async ({ page }) => {
  await page.goto("/settings");

  // El mock devuelve email: "comercio@test.com"
  await expect(page.locator('input[type="email"]')).toHaveValue("comercio@test.com", { timeout: 12_000 });
});

// ── S2: Tab de perfil muestra RUC (read-only) ────────────────────────────────

test("profile tab shows RUC as read-only field", async ({ page }) => {
  await page.goto("/settings");

  // RUC: primer input readOnly en el form (profile-tab.tsx: <input readOnly value={profile?.ruc} .../>)
  await expect(page.locator('input[readonly]').first()).toHaveValue("1234567890001", { timeout: 12_000 });
});

// ── S3: Tab de configuración es clickeable ────────────────────────────────────

test("configuration tab is accessible and shows webhook section", async ({ page }) => {
  await page.goto("/settings");

  // El tab "Configuracion" (sin tilde — así está en el código)
  await page.getByRole("button", { name: /configuracion/i }).click();

  // El tab de config muestra el placeholder del webhook
  await expect(
    page.getByPlaceholder(/https:\/\/mi-tienda\.com\/webhooks/i)
  ).toBeVisible({ timeout: 5_000 });
});

// ── S4: Campo webhook URL es editable ────────────────────────────────────────

test("webhook URL field is editable", async ({ page }) => {
  await page.goto("/settings");

  await page.getByRole("button", { name: /configuracion/i }).click();

  const webhookInput = page.getByPlaceholder(/https:\/\/mi-tienda\.com\/webhooks/i);
  await webhookInput.fill("https://miapp.ec/webhook");
  await expect(webhookInput).toHaveValue("https://miapp.ec/webhook");
});

// ── S5: Guardar webhook cambia el botón a "Guardado" ─────────────────────────

test("saving webhook URL shows Guardado on button", async ({ page }) => {
  await page.goto("/settings");

  await page.getByRole("button", { name: /configuracion/i }).click();

  const webhookInput = page.getByPlaceholder(/https:\/\/mi-tienda\.com\/webhooks/i);
  await webhookInput.fill("https://miapp.ec/webhook");

  // El botón de submit del form de webhook tiene texto "Guardar webhook"
  await page.getByRole("button", { name: /guardar webhook/i }).click();

  // Tras el PUT exitoso, el botón cambia a "Guardado" (whOk = true)
  await expect(page.getByRole("button", { name: /guardado/i })).toBeVisible({ timeout: 8_000 });
});
