import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/set-cookie
 *
 * Recibe el JWT del login cross-origin y lo guarda como cookie first-party.
 * Necesario porque el backend corre en dominio distinto (Cloud Run) y
 * Set-Cookie cross-origin con SameSite=Lax es ignorado por el browser.
 *
 * Body: { token: string }
 */
export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token requerido" }, { status: 400 });
  }

  // En Route Handlers, cookies se setean en el objeto Response (no via cookies())
  const response = NextResponse.json({ ok: true });
  response.cookies.set("access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return response;
}
