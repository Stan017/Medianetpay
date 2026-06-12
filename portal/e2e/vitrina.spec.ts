/**
 * Tests de la página Mi Vitrina.
 *
 * El mock devuelve vitrina_active=false, services=[].
 * Estado inicial: vitrina inactiva, sin servicios.
 */

import { test, expect } from "@playwright/test";
import { setAuthCookie } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setAuthCookie(context);
});

// ── VI1: Heading "Mi Vitrina" ─────────────────────────────────────────────────

test("vitrina page shows heading", async ({ page }) => {
  await page.goto("/vitrina");

  await expect(page.getByRole("heading", { name: /mi vitrina/i })).toBeVisible({ timeout: 12_000 });
});

// ── VI2: Estado inicial "Vitrina inactiva" ────────────────────────────────────

test("vitrina page shows inactive status on first load", async ({ page }) => {
  await page.goto("/vitrina");

  await expect(page.getByText(/vitrina inactiva/i)).toBeVisible({ timeout: 12_000 });
});

// ── VI3: KPI card "Servicios activos" con "0 / 10" ───────────────────────────

test("vitrina page shows services count KPI", async ({ page }) => {
  await page.goto("/vitrina");

  // "Servicios (0 / 10)" paragraph in the services toolbar
  await expect(page.locator('p', { hasText: /Servicios \(/ })).toBeVisible({ timeout: 12_000 });
});

// ── VI4: Botón "Nuevo servicio" visible ───────────────────────────────────────

test("vitrina page shows Nuevo servicio button", async ({ page }) => {
  await page.goto("/vitrina");

  await expect(page.getByRole("button", { name: /nuevo servicio/i })).toBeVisible({ timeout: 12_000 });
});

// ── VI5: Estado vacío con botón "Agregar primer servicio" ────────────────────

test("vitrina empty state shows Agregar primer servicio button", async ({ page }) => {
  await page.goto("/vitrina");

  await expect(page.getByRole("button", { name: /agregar primer servicio/i }))
    .toBeVisible({ timeout: 12_000 });
});
