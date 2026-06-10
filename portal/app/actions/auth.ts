"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const COOKIE_OPTIONS = {
  httpOnly: false,          // false → JS puede leerla para requests cross-origin
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 días
};

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginAction(
  email: string,
  password: string,
): Promise<{ error: string } | never> {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body?.detail ?? {}) as Record<string, string>;
    return { error: detail?.message ?? "Credenciales incorrectas" };
  }

  const { access_token } = await res.json();
  const cookieStore = await cookies();
  cookieStore.set("access_token", access_token, COOKIE_OPTIONS);

  redirect("/dashboard");
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function registerAction(formData: {
  business_name: string;
  ruc: string;
  email: string;
  password: string;
}): Promise<{ error: string } | never> {
  const res = await fetch(`${API_BASE}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body?.detail ?? {}) as Record<string, string>;
    return { error: detail?.message ?? "Error al crear la cuenta" };
  }

  const { access_token } = await res.json();
  const cookieStore = await cookies();
  cookieStore.set("access_token", access_token, COOKIE_OPTIONS);

  redirect("/dashboard");
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<never> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  // Notificar al backend (best-effort — no bloquear si falla)
  if (token) {
    await fetch(`${API_BASE}/v1/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${token}`,
      },
    }).catch(() => {});
  }

  cookieStore.delete("access_token");
  redirect("/login");
}
