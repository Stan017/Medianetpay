/**
 * Tests de la página Reportes.
 *
 * Página client-side con filtros de fecha, presets (7/15/30 días),
 * botón "Ver resumen" y descarga CSV.
 */

import { test, expect } from "@playwright/test";
import { setAuthCookie } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setAuthCookie(context);
});

// ── RP1: Heading principal ─────────────────────────────────────────────────

test("reportes page shows main heading", async ({ page }) => {
  await page.goto("/reportes");

  await expect(page.getByRole("heading", { name: /reportes/i })).toBeVisible({ timeout: 10_000 });
});

// ── RP2: Sección "Rango de fechas" ───────────────────────────────────────────

test("reportes page shows date range section", async ({ page }) => {
  await page.goto("/reportes");

  await expect(page.getByText(/rango de fechas/i)).toBeVisible({ timeout: 10_000 });
});

// ── RP3: Labels "Desde" y "Hasta" ────────────────────────────────────────────

test("reportes page has Desde and Hasta date inputs", async ({ page }) => {
  await page.goto("/reportes");

  await expect(page.getByText(/desde/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/hasta/i).first()).toBeVisible();
});

// ── RP4: Botón "Ver resumen" ─────────────────────────────────────────────────

test("reportes page has Ver resumen button", async ({ page }) => {
  await page.goto("/reportes");

  await expect(page.getByRole("button", { name: /ver resumen/i })).toBeVisible({ timeout: 10_000 });
});

// ── RP5: Botón "Descargar CSV" ───────────────────────────────────────────────

test("reportes page has Descargar CSV button", async ({ page }) => {
  await page.goto("/reportes");

  await expect(page.getByRole("button", { name: /descargar csv/i })).toBeVisible({ timeout: 10_000 });
});
