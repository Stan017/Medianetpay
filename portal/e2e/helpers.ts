import type { BrowserContext } from "@playwright/test";

// JWT que getAuthUser() en lib/auth.ts acepta sin verificar firma.
// Solo comprueba: token existe + payload.exp en el futuro.
function makeFakeJwt(): string {
  const header  = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    sub:   "test-merchant-id",
    email: "comercio@test.com",
    exp:   Math.floor(Date.now() / 1000) + 86400,
  })).toString("base64url");
  return `${header}.${payload}.fakesignature`;
}

/**
 * Inyecta la cookie `access_token` para que el DashboardLayout
 * no redirija a /login. Llama antes de navegar a cualquier ruta protegida.
 */
export async function setAuthCookie(context: BrowserContext): Promise<void> {
  await context.addCookies([{
    name:   "access_token",
    value:  makeFakeJwt(),
    domain: "localhost",
    path:   "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }]);
}
