/**
 * Tests del HistoryScreen.
 * Prueba header, búsqueda, filtros y estados de la lista.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'http://localhost:8000' } } },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn(),
}));

const mockListTransactions = jest.fn();

jest.mock('../../src/api/transactions', () => ({
  listTransactions: (...args: any[]) => mockListTransactions(...args),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

import HistoryScreen from '../../src/screens/HistoryScreen';

beforeEach(() => {
  mockListTransactions.mockResolvedValue({ data: [], total_pages: 1, page: 1 });
});

// HS1: header "Historial"
test('HS1: renders Historial header', () => {
  const { getByText } = render(<HistoryScreen />);
  expect(getByText('Historial')).toBeTruthy();
});

// HS2: campo de búsqueda con placeholder correcto
test('HS2: search input has correct placeholder', () => {
  const { getByPlaceholderText } = render(<HistoryScreen />);
  expect(getByPlaceholderText('Buscar por descripción o monto...')).toBeTruthy();
});

// HS3: chips de filtro presentes
test('HS3: renders all filter chips', () => {
  const { getByText } = render(<HistoryScreen />);
  expect(getByText('Todos')).toBeTruthy();
  expect(getByText('Aprobados')).toBeTruthy();
  expect(getByText('Rechazados')).toBeTruthy();
  expect(getByText('Pendientes')).toBeTruthy();
});

// HS4: muestra transacción cuando hay data
test('HS4: shows transaction description when data is loaded', async () => {
  mockListTransactions.mockResolvedValueOnce({
    data: [
      {
        id: 'txn-001',
        description: 'Servicio de prueba',
        amount: '50.00',
        status: 'completed',
        created_at: new Date().toISOString(),
        payment_method: 'card',
        installments: 1,
      },
    ],
    total_pages: 1,
    page: 1,
  });

  const { findByText } = render(<HistoryScreen />);
  expect(await findByText('Servicio de prueba')).toBeTruthy();
});

// HS5: estado vacío cuando no hay transacciones
test('HS5: shows empty state when no transactions', async () => {
  mockListTransactions.mockResolvedValueOnce({ data: [], total_pages: 1, page: 1 });

  const { findByText } = render(<HistoryScreen />);
  expect(await findByText('No hay transacciones')).toBeTruthy();
});
