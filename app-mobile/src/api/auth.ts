import { apiClient } from './client';

export interface AuthResponse {
  access_token: string;
  merchant_id: string;
  business_name: string;
  sk_test?: string;
  pk_test?: string;
}

export interface MerchantProfile {
  id: string;
  business_name: string;
  ruc: string;
  email: string;
  api_key_public: string;
  webhook_url: string | null;
  status: string;
  test_mode: boolean;
}

// ── Email + password ──────────────────────────────────────────────────────────

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/v1/auth/login', {
    email,
    password,
  });
  return data;
}

// ── Google — envía el ID token al backend para verificación ──────────────────
// El ID token lo provee expo-auth-session desde el hook useIdTokenAuthRequest.
// Esta función solo se llama cuando el hook ya tiene el token.

export async function loginWithGoogleIdToken(idToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/v1/auth/google', {
    id_token: idToken,
  });
  return data;
}

// ── Perfil ────────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<MerchantProfile> {
  const { data } = await apiClient.get<MerchantProfile>('/v1/auth/me');
  return data;
}
