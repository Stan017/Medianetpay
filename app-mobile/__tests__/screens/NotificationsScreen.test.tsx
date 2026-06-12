/**
 * Tests del NotificationsScreen.
 * Mockea notificationStore para controlar el estado de las notificaciones.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import type { AppNotification } from '../../src/api/notifications';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
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

// Estado del store controlado por cada test
const mockFetchNotifications = jest.fn().mockResolvedValue(undefined);
const mockMarkRead = jest.fn().mockResolvedValue(undefined);
const mockMarkAllRead = jest.fn().mockResolvedValue(undefined);

let mockStoreState: {
  notifications: AppNotification[];
  unreadCount: number;
  fetchNotifications: jest.Mock;
  markRead: jest.Mock;
  markAllRead: jest.Mock;
  toastQueue: AppNotification[];
  dismissToast: jest.Mock;
  setNotifications: jest.Mock;
};

jest.mock('../../src/store/notificationStore', () => ({
  useNotificationStore: () => mockStoreState,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'notif-001',
    merchant_id: 'merch-001',
    type: 'txn.approved',
    title: 'Pago aprobado ✓',
    body: '$25.00 recibido',
    read: false,
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeStore(overrides: Partial<typeof mockStoreState> = {}) {
  return {
    notifications: [],
    unreadCount: 0,
    fetchNotifications: mockFetchNotifications,
    markRead: mockMarkRead,
    markAllRead: mockMarkAllRead,
    toastQueue: [],
    dismissToast: jest.fn(),
    setNotifications: jest.fn(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

import NotificationsScreen from '../../src/screens/NotificationsScreen';

beforeEach(() => {
  mockStoreState = makeStore();
  mockFetchNotifications.mockClear();
  mockGoBack.mockClear();
});

// NS1: heading "Notificaciones"
test('NS1: renders Notificaciones heading', () => {
  const { getByText } = render(<NotificationsScreen />);
  expect(getByText('Notificaciones')).toBeTruthy();
});

// NS2: estado vacío cuando no hay notificaciones
test('NS2: shows empty state when notifications list is empty', () => {
  mockStoreState = makeStore({ notifications: [], unreadCount: 0 });
  const { getByText } = render(<NotificationsScreen />);
  expect(getByText('Sin notificaciones aún')).toBeTruthy();
});

// NS3: muestra título de notificación cuando hay items
test('NS3: renders notification title when notifications are present', () => {
  const notif = makeNotification({ title: 'Pago aprobado ✓' });
  mockStoreState = makeStore({ notifications: [notif], unreadCount: 1 });

  const { getByText } = render(<NotificationsScreen />);
  expect(getByText('Pago aprobado ✓')).toBeTruthy();
});

// NS4: "Leer todo" visible cuando unreadCount > 0
test('NS4: Leer todo button is visible when unreadCount > 0', () => {
  const notif = makeNotification({ read: false });
  mockStoreState = makeStore({ notifications: [notif], unreadCount: 1 });

  const { getByText } = render(<NotificationsScreen />);
  expect(getByText('Leer todo')).toBeTruthy();
});

// NS5: "Leer todo" oculto cuando unreadCount === 0
test('NS5: Leer todo button is hidden when unreadCount is 0', () => {
  const notif = makeNotification({ read: true });
  mockStoreState = makeStore({ notifications: [notif], unreadCount: 0 });

  const { queryByText } = render(<NotificationsScreen />);
  expect(queryByText('Leer todo')).toBeNull();
});
