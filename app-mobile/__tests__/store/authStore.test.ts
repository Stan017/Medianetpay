/**
 * Tests del authStore (Zustand).
 * No renderiza componentes — prueba la lógica del store directamente.
 */

import * as SecureStore from 'expo-secure-store';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// client.ts usa expo-constants para leer la base URL — mockearlo evita errores
// de configuración de Expo al importar el módulo en entorno de test.
jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'http://localhost:8000' } } },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockSecure = SecureStore as jest.Mocked<typeof SecureStore>;

const FAKE_TOKEN = 'eyJ0.test.sig';
const FAKE_MERCHANT = {
  merchant_id: 'merch-001',
  business_name: 'Test Store',
  ruc: '1234567890001',
  email: 'store@test.com',
  webhook_url: null,
  webhook_secret: null,
  status: 'active' as const,
  test_mode: true,
  api_key_public: 'pk_test_abc',
  created_at: '2024-01-01T00:00:00Z',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('authStore', () => {
  // Reimportar el store fresco en cada test para evitar estado compartido.
  // jest.isolateModules() garantiza un módulo limpio por test.
  function freshStore() {
    jest.isolateModules(() => {});
    const { useAuthStore } = require('../../src/store/authStore');
    return useAuthStore.getState();
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecure.getItemAsync.mockResolvedValue(null);
  });

  it('A1: estado inicial tiene token=null, merchant=null, isLoading=true', () => {
    const { useAuthStore } = require('../../src/store/authStore');
    const state = useAuthStore.getState();

    expect(state.token).toBeNull();
    expect(state.merchant).toBeNull();
    expect(state.isLoading).toBe(true);
  });

  it('A2: setAuth persiste el token en SecureStore y actualiza el estado', async () => {
    const { useAuthStore } = require('../../src/store/authStore');
    const { setAuth } = useAuthStore.getState();

    await setAuth(FAKE_TOKEN, FAKE_MERCHANT);

    expect(mockSecure.setItemAsync).toHaveBeenCalledWith('medianetpay_jwt', FAKE_TOKEN);
    const { token, merchant, isLoading } = useAuthStore.getState();
    expect(token).toBe(FAKE_TOKEN);
    expect(merchant?.email).toBe(FAKE_MERCHANT.email);
    expect(isLoading).toBe(false);
  });

  it('A3: logout elimina el token de SecureStore y limpia el estado', async () => {
    const { useAuthStore } = require('../../src/store/authStore');
    // Primero autenticar
    await useAuthStore.getState().setAuth(FAKE_TOKEN, FAKE_MERCHANT);
    // Luego cerrar sesión
    await useAuthStore.getState().logout();

    expect(mockSecure.deleteItemAsync).toHaveBeenCalledWith('medianetpay_jwt');
    const { token, merchant } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(merchant).toBeNull();
  });

  it('A4: loadStoredToken retorna null y pone isLoading=false cuando SecureStore está vacío', async () => {
    mockSecure.getItemAsync.mockResolvedValue(null);
    const { useAuthStore } = require('../../src/store/authStore');

    const result = await useAuthStore.getState().loadStoredToken();

    expect(result).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('A5: loadStoredToken restaura el token desde SecureStore', async () => {
    mockSecure.getItemAsync.mockResolvedValue(FAKE_TOKEN);
    const { useAuthStore } = require('../../src/store/authStore');

    const result = await useAuthStore.getState().loadStoredToken();

    expect(result).toBe(FAKE_TOKEN);
    expect(useAuthStore.getState().token).toBe(FAKE_TOKEN);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
