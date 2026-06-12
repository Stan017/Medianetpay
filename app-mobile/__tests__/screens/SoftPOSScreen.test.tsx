/**
 * Tests de SoftPOSScreen — keypad, display de monto, selector de tarjetas.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SoftPOSScreen from '../../src/screens/SoftPOSScreen';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'http://localhost:8000' } } },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SoftPOSScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('P1: renderiza todos los dígitos del keypad (1-9 y 0)', () => {
    const { getByText, getAllByText } = render(<SoftPOSScreen />);

    // 1-9 solo aparecen en el keypad — getByText es suficiente
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(d => {
      expect(getByText(d)).toBeTruthy();
    });
    // '0' aparece también en el display (intPart="0") — al menos 2 coincidencias
    expect(getAllByText('0').length).toBeGreaterThanOrEqual(2);
  });

  it('P2: presionar dígitos actualiza el display del monto', () => {
    const { getByText } = render(<SoftPOSScreen />);

    // Presionar 1,5,2,3 → digits="1523", amount=15.23
    // intPart="15" — número de 2 cifras, ningún botón del keypad tiene "15"
    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('5'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByText('3'));

    expect(getByText('15')).toBeTruthy();  // intPart único, no existe botón "15"
    expect(getByText('.23')).toBeTruthy(); // decPart único
  });

  it('P3: muestra las 3 tarjetas de prueba con sus marcas', () => {
    const { getByText } = render(<SoftPOSScreen />);

    expect(getByText('Visa •••• 4242')).toBeTruthy();
    expect(getByText('Mastercard •••• 5500')).toBeTruthy();
    expect(getByText('Visa •••• 0002')).toBeTruthy();
  });

  it('P4: tarjeta 4242 muestra "✓ Aprobada" y tarjeta 0002 muestra "✗ Rechazada"', () => {
    const { getAllByText } = render(<SoftPOSScreen />);

    expect(getAllByText('✓ Aprobada').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('✗ Rechazada').length).toBe(1);
  });

  it('P5: tecla C limpia el monto — el display vuelve a mostrar ".00"', () => {
    const { getByText } = render(<SoftPOSScreen />);

    // Presionar 5 → digits="5", intPart="0", decPart="05"
    fireEvent.press(getByText('5'));
    expect(getByText('.05')).toBeTruthy();

    // Presionar C → digits="" → intPart="0", decPart="00"
    fireEvent.press(getByText('C'));
    expect(getByText('.00')).toBeTruthy();
  });
});
