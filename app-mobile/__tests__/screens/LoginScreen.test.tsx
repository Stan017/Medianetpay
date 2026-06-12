/**
 * Tests de LoginScreen.
 * Renderiza el componente con todas las dependencias nativas mockeadas.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/LoginScreen';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Fonts — los tests no necesitan cargar fuentes reales
jest.mock('@expo-google-fonts/outfit', () => ({
  useFonts: () => [true, null],
  Outfit_400Regular: '',
  Outfit_600SemiBold: '',
  Outfit_700Bold: '',
  Outfit_800ExtraBold: '',
  Outfit_900Black: '',
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), replace: jest.fn() }),
  useFocusEffect: jest.fn(),
  NavigationContainer: ({ children }: any) => children,
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: () => [null, null, jest.fn()],
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'medianetpay://',
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'http://localhost:8000', googleWebClientId: '' } } },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockLoginWithEmail = jest.fn();
const mockGetProfile = jest.fn();

jest.mock('../../src/api/auth', () => ({
  loginWithEmail: (...args: any[]) => mockLoginWithEmail(...args),
  loginWithGoogleIdToken: jest.fn(),
  getProfile: (...args: any[]) => mockGetProfile(...args),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('L1: renderiza el input de email con placeholder correcto', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('tu@correo.com')).toBeTruthy();
  });

  it('L2: renderiza el input de contraseña', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('L3: renderiza el botón "Iniciar Sesión"', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Iniciar Sesión')).toBeTruthy();
  });

  it('L4: muestra mensaje de error cuando loginWithEmail lanza excepción', async () => {
    mockLoginWithEmail.mockRejectedValue(new Error('Credenciales incorrectas'));

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('tu@correo.com'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrongpass');
    fireEvent.press(getByText('Iniciar Sesión'));

    await waitFor(() => {
      expect(getByText('Credenciales incorrectas')).toBeTruthy();
    });
  });

  it('L5: llama loginWithEmail con el email y contraseña ingresados', async () => {
    mockLoginWithEmail.mockResolvedValue({ access_token: 'tok' });
    mockGetProfile.mockResolvedValue({
      merchant_id: 'merch-001',
      business_name: 'Test',
      email: 'test@test.com',
      ruc: '1234567890001',
      webhook_url: null,
      webhook_secret: null,
      status: 'active',
      test_mode: true,
      api_key_public: 'pk_test',
      created_at: '2024-01-01T00:00:00Z',
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('tu@correo.com'), 'comercio@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'pass1234');
    fireEvent.press(getByText('Iniciar Sesión'));

    await waitFor(() => {
      expect(mockLoginWithEmail).toHaveBeenCalledWith('comercio@test.com', 'pass1234');
    });
  });
});
