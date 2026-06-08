import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/v/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas: siempre accesibles
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Rutas protegidas: requieren cookie de sesión
  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - _next/static (archivos estáticos de Next.js)
     * - _next/image  (optimización de imágenes)
     * - favicon.ico
     * - archivos con extensión (png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).+)",
  ],
};
