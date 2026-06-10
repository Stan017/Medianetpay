/**
 * api.ts — cliente HTTP universal para el portal.
 *
 * Un solo objeto `api` que funciona en Server Components, Client Components
 * y Server Actions sin configuración adicional.
 *
 * En servidor: lee `access_token` de next/headers y lo reenvía como Cookie.
 * En cliente:  lee `access_token` de document.cookie y lo envía como Bearer.
 *
 * Uso idéntico en cualquier contexto:
 *   import { api } from "@/lib/api";
 *   const data = await api.get<Foo>("/v1/...");
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function buildError(status: number, body: unknown): ApiError {
  const detail = (body as Record<string, unknown>)?.detail ?? {};
  const d = detail as Record<string, string>;
  return new ApiError(status, d?.code ?? "unknown", d?.message ?? String(status));
}

// ── Request universal (server + client) ──────────────────────────────────────

async function universalRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const authHeaders: Record<string, string> = {};

  if (typeof window === "undefined") {
    // Server-side (Server Components, Server Actions, Route Handlers)
    // Lee la cookie desde next/headers y la reenvía al backend
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const cookieHeader = cookieStore.toString();
      if (cookieHeader) authHeaders["Cookie"] = cookieHeader;
    } catch {
      // Fuera de contexto de request (build time, etc.) — no hay cookie
    }
  } else {
    // Client-side: lee el token de document.cookie (cookie NO httpOnly)
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];
    if (token) authHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw buildError(res.status, await res.json().catch(() => ({})));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

// ── API object ────────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => universalRequest<T>(path),
  post: <T>(path: string, body: unknown) =>
    universalRequest<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    universalRequest<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    universalRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    universalRequest<T>(path, { method: "DELETE" }),
};

// Alias para compatibilidad con imports existentes
export const apiClient = api;

/**
 * @deprecated Usar `api` directamente — ahora es universal.
 * Se mantiene para no romper imports existentes.
 */
export async function createServerApi() {
  return api;
}
