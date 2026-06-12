/**
 * Tests del HomeScreen.
 * Mockea API de transacciones, analytics, authStore, NotificationBell,
 * ToastBanner y useNotificationPolling para aislar la lógica de UI.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

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
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'http://localhost:8000' } } },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn(),
}));

// Merchant autenticado
jest.mock('../../src/store/authStore', () => ({
  useAuthStore: () => ({
    merchant: { business_name: 'Salón Prueba', test_mode: false },
    logout: jest.fn(),
  }),
}));

// API
jest.mock('../../src/api/transactions', () => ({
  listTransactions: jest.fn().mockResolvedValue({ data: [], total_pages: 1, page: 1 }),
  getAnalyticsSummary: jest.fn().mockResolvedValue({
    total_amount_completed: '0.00',
    completed_count: 0,
    failed_count: 0,
    pending_count: 0,
    reversed_count: 0,
    total_transactions: 0,
    currency: 'USD',
    date_from: null,
    date_to: null,
  }),
}));

// Componentes que abren stores adicionales — usar stubs simples
jest.mock('../../src/components/NotificationBell', () => () => null);
jest.mock('../../src/components/ToastBanner', () => () => null);
jest.mock('../../src/hooks/useNotificationPolling', () => ({
  useNotificationPolling: jest.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

import HomeScreen from '../../src/screens/HomeScreen';

// H1: saludo "Bienvenido de vuelta"
test('H1: renders Bienvenido de vuelta greeting', () => {
  const { getByText } = render(<HomeScreen />);
  expect(getByText('Bienvenido de vuelta')).toBeTruthy();
});

// H2: nombre del comercio
test('H2: displays merchant business_name', () => {
  const { getByText } = render(<HomeScreen />);
  expect(getByText('Salón Prueba')).toBeTruthy();
});

// H3: botón "Cobrar"
test('H3: shows Cobrar action button', () => {
  const { getByText } = render(<HomeScreen />);
  expect(getByText('Cobrar')).toBeTruthy();
});

// H4: botón "Datáfono"
test('H4: shows Datáfono action button', () => {
  const { getByText } = render(<HomeScreen />);
  expect(getByText('Datáfono')).toBeTruthy();
});

// H5: sección "Recientes"
test('H5: shows Recientes section title', () => {
  const { getByText } = render(<HomeScreen />);
  expect(getByText('Recientes')).toBeTruthy();
});
