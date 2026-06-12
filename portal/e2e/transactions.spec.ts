/**
 * Tests de la página Transacciones.
 *
 * El mock devuelve 1 txn "Cobro de prueba" ($25.00, status "completed")
 * y summary con total_amount_completed="1250.00", total_transactions=42.
 */

import { test, expect } from "@playwright/test";
import { setAuthCookie } from "./helpers";

test.beforeEach(async ({ context }) => {
  await setAuthCookie(context);
});

// ── TX1: Heading principal ────────────────────────────────────────────────────

test("transactions page shows main heading", async ({ page }) => {
  await page.goto("/transactions");

  await expect(page.getByRole("heading", { name: /transacciones/i }))
    .toBeVisible({ timeout: 12_000 });
});

// ── TX2: KPI card "Total cobrado" visible ─────────────────────────────────────

test("transactions page shows Total cobrado KPI card", async ({ page }) => {
  await page.goto("/transactions");

  await expect(page.getByText(/total cobrado/i)).toBeVisible({ timeout: 12_000 });
});

// ── TX3: Tabla muestra la transacción del mock ───────────────────────────────

test("transactions table shows mock transaction description and amount", async ({ page }) => {
  await page.goto("/transactions");

  await expect(page.getByText(/juan pérez|juan perez/i)).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText(/\$25\.00|\$25,00/)).toBeVisible();
});

// ── TX4: Filtro / búsqueda visible ───────────────────────────────────────────

test("transactions page has search or filter input", async ({ page }) => {
  await page.goto("/transactions");

  // Puede ser un input de búsqueda (placeholder con "buscar") o un select de status
  const hasSearch = await page.locator('input[placeholder*="uscar" i], input[placeholder*="ransacci" i], select').first().isVisible({ timeout: 12_000 });
  expect(hasSearch).toBe(true);
});

// ── TX5: Badge de estado "completado" ────────────────────────────────────────

test("transactions table shows completed status badge", async ({ page }) => {
  await page.goto("/transactions");

  await expect(page.getByText(/completad[ao]/i).first()).toBeVisible({ timeout: 12_000 });
});
