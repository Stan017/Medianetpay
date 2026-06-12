/**
 * Tests de Links de Cobro — KPIs, tabla, modal de creación.
 *
 * El mock API devuelve 1 link activo "Servicio de peluquería" ($50.00, 3 usos).
 * POST /v1/links crea un link y devuelve el objeto con description "Nuevo link".
 */

import { test, expect } from "@playwright/test";
import { setAuthCookie } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setAuthCookie(context);
});

// ── L1: KPI cards de links ────────────────────────────────────────────────────

test("links page shows KPI cards", async ({ page }) => {
  await page.goto("/links");

  await expect(page.getByText(/links activos/i)).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText(/usos totales/i)).toBeVisible();
});

// ── L2: Tabla muestra el link existente ──────────────────────────────────────

test("links table shows description and amount from mock", async ({ page }) => {
  await page.goto("/links");

  // El mock devuelve description: "Servicio de peluquería" (puede aparecer 2 veces, .first() evita strict mode)
  await expect(page.getByText(/servicio de peluquer[ií]a/i).first()).toBeVisible({ timeout: 12_000 });
  // Y amount: "50.00"
  await expect(page.getByText(/50\.00/)).toBeVisible();
});

// ── L3: Botón "Nuevo link" abre el modal ──────────────────────────────────────

test("nuevo link button opens creation modal", async ({ page }) => {
  await page.goto("/links");

  // El botón tiene texto "Nuevo link"
  await page.getByRole("button", { name: /nuevo link/i }).first().click();

  // El modal tiene heading "Nuevo link de cobro"
  await expect(page.getByText(/nuevo link de cobro/i)).toBeVisible({ timeout: 5_000 });
});

// ── L4: Formulario de creación tiene los campos requeridos ───────────────────

test("create link form has description and amount fields", async ({ page }) => {
  await page.goto("/links");

  await page.getByRole("button", { name: /nuevo link/i }).first().click();

  // Label "Descripcion *" y placeholder "Ej: Pago por consultoria"
  await expect(page.getByPlaceholder(/pago por consultoria/i)).toBeVisible({ timeout: 5_000 });
  // Input de monto con placeholder "0.00"
  await expect(page.getByPlaceholder("0.00")).toBeVisible();
  // Botón submit "Crear link + QR"
  await expect(page.getByRole("button", { name: /crear link/i })).toBeVisible();
});

// ── L5: Crear link y ver el resultado en la tabla ────────────────────────────

test("creating a link adds it to the list", async ({ page }) => {
  await page.goto("/links");

  await page.getByRole("button", { name: /nuevo link/i }).first().click();

  // Llenar descripción — el mock devuelve este texto como description del link creado
  await page.getByPlaceholder(/pago por consultoria/i).fill("Test Playwright Link");
  await page.getByPlaceholder("0.00").fill("75.00");

  await page.getByRole("button", { name: /crear link/i }).click();

  // El modal se cierra y el link creado aparece en la lista con su descripción exacta
  await expect(page.getByText("Test Playwright Link")).toBeVisible({ timeout: 8_000 });
});
