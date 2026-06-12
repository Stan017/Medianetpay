/**
 * Tests del VitrinaScreen.
 * Mockea catalogStore para controlar vitrina_active y services.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import type { VitrinaOut, CatalogService } from '../../src/api/catalog';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'http://localhost:8000' } } },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn(),
}));

let mockStoreState: {
  vitrina: VitrinaOut | null;
  loading: boolean;
  fetchVitrina: jest.Mock;
  toggleActive: jest.Mock;
  removeService: jest.Mock;
  setVitrina: jest.Mock;
};

jest.mock('../../src/store/catalogStore', () => ({
  useCatalogStore: () => mockStoreState,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeService(overrides: Partial<CatalogService> = {}): CatalogService {
  return {
    id: 'svc-001',
    merchant_id: 'merch-001',
    name: 'Corte de cabello',
    description: null,
    price: '25.00',
    image_url: null,
    payment_link_token: 'tok-abc',
    position: 0,
    active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeVitrina(overrides: Partial<VitrinaOut> = {}): VitrinaOut {
  return {
    slug: null,
    bio: null,
    profile_image_url: null,
    vitrina_active: false,
    vitrina_url: null,
    services: [],
    ...overrides,
  };
}

function makeStore(overrides: Partial<typeof mockStoreState> = {}) {
  return {
    vitrina: null,
    loading: false,
    fetchVitrina: jest.fn().mockResolvedValue(undefined),
    toggleActive: jest.fn().mockResolvedValue(undefined),
    removeService: jest.fn().mockResolvedValue(undefined),
    setVitrina: jest.fn(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

import VitrinaScreen from '../../src/screens/VitrinaScreen';

beforeEach(() => {
  mockStoreState = makeStore();
});

// V1: header "Mi Vitrina"
test('V1: renders Mi Vitrina header title', () => {
  const { getByText } = render(<VitrinaScreen />);
  expect(getByText('Mi Vitrina')).toBeTruthy();
});

// V2: "Vitrina inactiva" cuando vitrina_active=false
test('V2: shows Vitrina inactiva when vitrina_active is false', () => {
  mockStoreState = makeStore({ vitrina: makeVitrina({ vitrina_active: false }) });

  const { getByText } = render(<VitrinaScreen />);
  expect(getByText('Vitrina inactiva')).toBeTruthy();
});

// V3: "Vitrina activa" cuando vitrina_active=true
test('V3: shows Vitrina activa when vitrina_active is true', () => {
  mockStoreState = makeStore({
    vitrina: makeVitrina({
      vitrina_active: true,
      slug: 'mi-negocio',
      vitrina_url: 'https://medianetpay.ec/v/mi-negocio',
    }),
  });

  const { getByText } = render(<VitrinaScreen />);
  expect(getByText('Vitrina activa')).toBeTruthy();
});

// V4: muestra nombre de servicio en la lista
test('V4: renders service name in list', () => {
  const svc = makeService({ name: 'Manicure express' });
  mockStoreState = makeStore({ vitrina: makeVitrina({ services: [svc] }) });

  const { getByText } = render(<VitrinaScreen />);
  expect(getByText('Manicure express')).toBeTruthy();
});

// V5: estado vacío muestra "+ Agregar primer servicio"
test('V5: shows Agregar primer servicio in empty state', () => {
  mockStoreState = makeStore({ vitrina: makeVitrina({ services: [] }) });

  const { getByText } = render(<VitrinaScreen />);
  expect(getByText('+ Agregar primer servicio')).toBeTruthy();
});
