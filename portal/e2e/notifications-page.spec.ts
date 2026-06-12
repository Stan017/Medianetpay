/**
 * Tests de la página Notificaciones del portal.
 *
 * El mock devuelve summary con completed_count=38, failed_count=3, pending_count=1.
 * La página genera notificaciones derivadas de esos totales.
 */

import { test, expect } from "@playwright/test";
import { setAuthCookie } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setAuthCookie(context);
});

// ── NP1: Heading principal ────────────────────────────────────────────────────

test("notifications page shows heading", async ({ page }) => {
  await page.goto("/notifications");

  await expect(page.getByRole("heading", { name: /notificaciones/i }))
    .toBeVisible({ timeout: 12_000 });
});

// ── NP2: Notificación de pagos completados ────────────────────────────────────

test("notifications page shows completed payments notification", async ({ page }) => {
  await page.goto("/notifications");

  // mock: completed_count=38 → "38 pagos completados"
  await expect(page.getByText(/pagos completados/i)).toBeVisible({ timeout: 12_000 });
});

// ── NP3: Notificación de liquidación ────────────────────────────────────────

test("notifications page shows liquidacion notification", async ({ page }) => {
  await page.goto("/notifications");

  await expect(page.getByText(/próxima liquidación programada/i)).toBeVisible({ timeout: 12_000 });
});

// ── NP4: Notificación de modo de prueba ──────────────────────────────────────

test("notifications page shows test mode notification", async ({ page }) => {
  await page.goto("/notifications");

  await expect(page.getByText(/modo de prueba activo/i)).toBeVisible({ timeout: 12_000 });
});

// ── NP5: Notificación de bienvenida ──────────────────────────────────────────

test("notifications page shows welcome notification", async ({ page }) => {
  await page.goto("/notifications");

  await expect(page.getByText(/bienvenido a medianetpay/i)).toBeVisible({ timeout: 12_000 });
});
