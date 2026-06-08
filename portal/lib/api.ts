/**
 * api.ts — cliente HTTP para el portal.
 *
 * Dos helpers:
 *  - apiClient  → para Client Components ("use client"). Usa credentials: "include"
 *                 para que el browser envíe la cookie automáticamente.
 *  - apiServer  → para Server Components. Recibe la cookie string del request
 *                 entrante y la reenvía al backend manualmente.
 *
 * Uso en Server Components:
 *   import { createServerApi } from "@/lib/api";
 *   import { cookies } from "next/headers";
 *   const api = await createServerApi();
 *   const data = await api.get<Foo>("/v1/...");
 *
 * Uso en Client Components:
 *   import { apiClient } from "@/lib/api";
 *   await apiClient.post("/v1/...", body);
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

// ── Client-side helper ────────────────────────────────────────────────────────

async function clientRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

  if (!res.ok) {
    throw buildError(res.status, await res.json().catch(() => ({})));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

export const apiClient = {
  get: <T>(path: string) => clientRequest<T>(path),
  post: <T>(path: string, body: unknown) =>
    clientRequest<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    clientRequest<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    clientRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    clientRequest<T>(path, { method: "DELETE" }),
};

// ── Server-side helper ────────────────────────────────────────────────────────

async function serverRequest<T>(
  cookieHeader: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw buildError(res.status, await res.json().catch(() => ({})));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

/**
 * Crea un helper de API para Server Components.
 * Extrae automáticamente la cookie del request entrante.
 *
 * @example
 *   const api = await createServerApi();
 *   const profile = await api.get<MerchantProfile>("/v1/auth/me");
 */
export async function createServerApi() {
  // Import dinámico para no romper Client Components que importan este archivo
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  return {
    get: <T>(path: string) => serverRequest<T>(cookieHeader, path),
    post: <T>(path: string, body: unknown) =>
      serverRequest<T>(cookieHeader, path, { method: "POST", body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) =>
      serverRequest<T>(cookieHeader, path, { method: "PUT", body: JSON.stringify(body) }),
  };
}

// Re-export apiClient como "api" para mantener compatibilidad con Client Components existentes
export const api = apiClient;
