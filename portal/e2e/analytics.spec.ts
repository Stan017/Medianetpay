/**
 * Tests de la página Analytics.
 *
 * El mock devuelve datos vacíos para hourly/weekly/customers (peak_label=null),
 * por lo que los insight cards muestran "—" y "Sin datos aún".
 */

import { test, expect } from "@playwright/test";
import { setAuthCookie } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setAuthCookie(context);
});

// ── AN1: Heading principal ────────────────────────────────────────────────────

test("analytics page shows main heading", async ({ page }) => {
  await page.goto("/analytics");

  await expect(page.getByRole("heading", { name: /análisis de tu negocio/i }))
    .toBeVisible({ timeout: 12_000 });
});

// ── AN2: Insight card "Tu hora pico" ─────────────────────────────────────────

test("analytics shows Tu hora pico insight card", async ({ page }) => {
  await page.goto("/analytics");

  await expect(page.getByText(/tu hora pico/i)).toBeVisible({ timeout: 12_000 });
});

// ── AN3: Insight card "Tu mejor día" ─────────────────────────────────────────

test("analytics shows Tu mejor dia insight card", async ({ page }) => {
  await page.goto("/analytics");

  await expect(page.getByText(/tu mejor día/i)).toBeVisible({ timeout: 12_000 });
});

// ── AN4: Sección "Cobros por hora del día" ───────────────────────────────────

test("analytics shows cobros por hora chart section", async ({ page }) => {
  await page.goto("/analytics");

  await expect(page.getByText(/cobros por hora del día/i)).toBeVisible({ timeout: 12_000 });
});

// ── AN5: Sección "Cobros por día de semana" ───────────────────────────────────

test("analytics shows cobros por dia de semana chart section", async ({ page }) => {
  await page.goto("/analytics");

  await expect(page.getByText(/cobros por día de semana/i)).toBeVisible({ timeout: 12_000 });
});
