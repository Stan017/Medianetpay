/**
 * Tests del Dashboard — KPIs, tabla de transacciones, sidebar.
 *
 * El mock API devuelve 42 txns, $1250.00 volumen, 1 txn "Juan Pérez", 1 link activo.
 */

import { test, expect } from "@playwright/test";
import { setAuthCookie } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setAuthCookie(context);
});

// ── D1: KPI cards visibles ───────────────────────────────────────────────────

test("dashboard shows volume and transactions KPI cards", async ({ page }) => {
  await page.goto("/dashboard");

  // Volumen del mes — el mock devuelve 1250.00, formateado como "$1.250,00"
  // Hay múltiples elementos con ese número; .first() evita strict mode violation
  await expect(page.getByText(/1[,.]?250/).first()).toBeVisible({ timeout: 12_000 });
  // Total transacciones: 42
  await expect(page.getByText("42")).toBeVisible();
});

// ── D2: Tabla de transacciones recientes ─────────────────────────────────────

test("recent transactions table renders with data", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByText(/transacciones recientes/i)).toBeVisible({ timeout: 12_000 });
  // La txn del mock tiene description: "Cobro de prueba" (campo mostrado en el dashboard)
  await expect(page.getByText(/cobro de prueba/i)).toBeVisible();
  // Y amount: "25.00"
  await expect(page.getByText(/\$25\.00|\$25,00/)).toBeVisible();
});

// ── D3: Sidebar con items de navegación ──────────────────────────────────────

test("sidebar shows all navigation items", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("link", { name: /transacciones/i })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole("link", { name: /links de cobro/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /an[aá]lis/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /configuraci[oó]n/i })).toBeVisible();
});

// ── D4: Badge de estado "completado" ─────────────────────────────────────────

test("completed transaction shows status badge", async ({ page }) => {
  await page.goto("/dashboard");

  // El mock devuelve txn con status "completed" → label "Completado" o "Aprobado"
  const badge = page.getByText(/completado|aprobado/i).first();
  await expect(badge).toBeVisible({ timeout: 12_000 });
});

// ── D5: Link activo visible ───────────────────────────────────────────────────

test("dashboard shows active payment link", async ({ page }) => {
  await page.goto("/dashboard");

  // El mock tiene 1 link activo: "Servicio de peluquería"
  await expect(page.getByText(/peluquer[ií]a/i)).toBeVisible({ timeout: 12_000 });
});
