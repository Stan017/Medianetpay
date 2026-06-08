/**
 * Cliente axios centralizado.
 * - Base URL configurable via app.json extra.apiBaseUrl
 * - Inyecta el JWT en Authorization: Bearer <token>
 * - Emula cookie httpOnly: manda el token en header (la app no usa cookies)
 */
import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// En emulador Android, 10.0.2.2 apunta al localhost del host.
// En producción apunta a https://api.medianetpay.ec
const BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'http://10.0.2.2:8000';

export const TOKEN_KEY = 'medianetpay_jwt';

/**
 * Helper para subir FormData usando fetch() nativo en vez de axios/XHR.
 * En React Native Android, XMLHttpRequest (que usa axios) falla silenciosamente
 * con FormData. fetch() nativo lo maneja correctamente.
 * Bug: FORMDATA-XHR-RN
 */
export async function fetchMultipart<T = any>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH',
  form: FormData,
): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // NO fijar Content-Type — fetch lo pone automáticamente con el boundary correcto
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    body: form,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.detail;
    const msg =
      typeof detail === 'string'
        ? detail
        : detail?.message ?? `Error ${response.status}`;
    const err = Object.assign(new Error(msg), {
      status: response.status,
      code: detail?.code,
      detail: data,
      isNetworkError: false,
    });
    throw err;
  }
  return data as T;
}

// IMPORTANTE: NO fijar Content-Type por defecto.
// Si lo fijamos a application/json, axios convierte FormData a JSON al detectar
// el header → backend responde 400 "Missing boundary". Sin default, axios elige
// el Content-Type apropiado por request: JSON para objetos, multipart para FormData.
// Bug: MULTIPART-CT
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
});

// Interceptor: inyectar JWT en cada request
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // También mandamos la cookie para compatibilidad con el portal
    config.headers.Cookie = `access_token=${token}`;
  }
  return config;
});

/**
 * Tipo del error enriquecido que llega a los catch().
 * Preserva info de axios (status, data del backend) además del message legible.
 * Bug fix: ERR-SWALLOW
 */
export interface ApiError extends Error {
  status?: number;          // 400, 401, 422, 500 ...
  code?: string;            // código semantico del backend (e.g. 'invalid_image')
  detail?: unknown;         // payload crudo del backend, por si hace falta
  isNetworkError?: boolean; // true cuando no hubo response (timeout / WiFi / IP mal)
}

// Interceptor: extraer mensaje legible PERO sin perder info de axios.
// Antes (ERR-SWALLOW): se hacía `new Error(message)` y se descartaba response/status.
// Ahora: enriquecemos un Error con campos planos para que los catch los lean.
apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    // DEBUG — visible en Metro bundler. Remover en producción.
    console.warn('[API ERROR]', {
      url: err.config?.url,
      method: err.config?.method?.toUpperCase(),
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
      code: err.code,
    });

    const detail = err?.response?.data?.detail;
    const backendMsg =
      typeof detail === 'string'
        ? detail
        : (detail && typeof detail === 'object' && 'message' in detail)
          ? (detail as any).message
          : undefined;
    const status = err?.response?.status;
    const code =
      detail && typeof detail === 'object' && 'code' in detail
        ? String((detail as any).code)
        : undefined;
    const isNetworkError = !err.response;

    // Mensaje humano para mostrar: backend > axios > generico
    const message =
      backendMsg ??
      (isNetworkError
        ? `Sin conexión al servidor (${err.message})`
        : `Error ${status ?? '??'}: ${err.message}`);

    const wrapped: ApiError = Object.assign(new Error(message), {
      status,
      code,
      detail: err?.response?.data,
      isNetworkError,
    });
    return Promise.reject(wrapped);
  },
);
