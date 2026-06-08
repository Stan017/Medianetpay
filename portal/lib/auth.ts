"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface AuthUser {
  merchant_id: string;
  business_name: string;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;

  try {
    // Decodifica el payload del JWT (sin verificar — la verificación real la hace el backend)
    const [, payloadB64] = token.split(".");
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8"),
    );
    if (payload.exp < Date.now() / 1000) return null;
    // business_name no está en el JWT; usamos el email como display name
    const email: string = payload.email ?? "";
    const business_name = email.split("@")[0] ?? "";
    return { merchant_id: payload.sub, business_name };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<void> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
}
