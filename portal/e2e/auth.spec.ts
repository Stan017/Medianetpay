/**
 * Tests de autenticación — login, credenciales incorrectas, redirección, logout.
 *
 * El mock API responde:
 *   - POST /v1/auth/login  con comercio@test.com / testpass123 → 200 + JWT
 *   - POST /v1/auth/login  con cualquier otra credencial       → 401
 */

import { test, expect } from "@playwright/test";
import { setAuthCookie } from "./helpers";

// ── A1: Formulario de login renderiza correctamente ──────────────────────────

test("login page renders form with email and password fields", async ({ page }) => {
  await page.goto("/login");

  // Los inputs tienen id="email" y id="password" y labels con htmlFor
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  // El label dice "Correo Electrónico"
  await expect(page.getByText(/correo electr[oó]nico/i)).toBeVisible();
  // El botón de submit contiene "Iniciar Sesión"
  await expect(page.getByRole("button", { name: /iniciar sesi[oó]n/i })).toBeVisible();
});

// ── A2: Credenciales incorrectas muestran mensaje de error ───────────────────

test("wrong credentials shows error message", async ({ page }) => {
  await page.goto("/login");

  await page.locator("#email").fill("malo@test.com");
  await page.locator("#password").fill("wrong");
  await page.getByRole("button", { name: /iniciar sesi[oó]n/i }).click();

  // loginAction devuelve { error: "Credenciales incorrectas" } y el componente lo muestra
  await expect(page.getByText(/credenciales incorrectas/i)).toBeVisible({ timeout: 10_000 });
});

// ── A3: Login exitoso redirige al dashboard ──────────────────────────────────

test("successful login redirects to dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.locator("#email").fill("comercio@test.com");
  await page.locator("#password").fill("testpass123");
  await page.getByRole("button", { name: /iniciar sesi[oó]n/i }).click();

  // loginAction setea cookie y hace redirect("/dashboard")
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 12_000 });
});

// ── A4: Sin cookie → redirige a /login ───────────────────────────────────────

test("unauthenticated request to dashboard redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
});

// ── A5: Logout redirige a /login ─────────────────────────────────────────────

test("logout button redirects to login", async ({ page, context }) => {
  await setAuthCookie(context);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 8_000 });

  // El sidebar tiene un botón "Cerrar sesión" con logoutAction
  await page.getByRole("button", { name: /cerrar sesi[oó]n/i }).click();

  await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
});
