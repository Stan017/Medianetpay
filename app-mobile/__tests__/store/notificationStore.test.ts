/**
 * Tests del notificationStore (Zustand).
 * Mockea las funciones de API — prueba solo la lógica del store.
 */

import type { AppNotification, NotificationListResponse } from '../../src/api/notifications';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFetch = jest.fn<Promise<NotificationListResponse>, []>();
const mockMarkRead = jest.fn<Promise<void>, [string]>();
const mockMarkAllRead = jest.fn<Promise<void>, []>();

jest.mock('../../src/api/notifications', () => ({
  fetchNotifications: (...args: any[]) => mockFetch(...args),
  markNotificationRead: (...args: any[]) => mockMarkRead(...args),
  markAllNotificationsRead: (...args: any[]) => mockMarkAllRead(...args),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'http://localhost:8000' } } },
}));
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'notif-001',
    merchant_id: 'merch-001',
    type: 'txn.approved',
    title: 'Pago aprobado',
    body: '$25.00 recibido',
    read: false,
    metadata: { transaction_id: 'txn-001', amount: '25.00' },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('notificationStore', () => {
  function freshStore() {
    const { useNotificationStore } = require('../../src/store/notificationStore');
    return useNotificationStore;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockMarkRead.mockResolvedValue(undefined);
    mockMarkAllRead.mockResolvedValue(undefined);
  });

  it('N1: estado inicial vacío — notifications=[], unreadCount=0, toastQueue=[], isInitialized=false', () => {
    const store = freshStore();
    const state = store.getState();

    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.toastQueue).toEqual([]);
    expect(state.isInitialized).toBe(false);
  });

  it('N2: primer fetchNotifications inicializa el estado SIN agregar toasts (evita spam de históricas)', async () => {
    const notif = makeNotification({ read: false });
    mockFetch.mockResolvedValue({ items: [notif], unread_count: 1 });

    const store = freshStore();
    await store.getState().fetchNotifications();
    const state = store.getState();

    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
    expect(state.isInitialized).toBe(true);
    // Primer fetch no agrega toasts — las notificaciones ya existían antes de abrir la app
    expect(state.toastQueue).toHaveLength(0);
  });

  it('N3: segundo fetchNotifications con notificación nueva → la agrega al toastQueue', async () => {
    const old = makeNotification({ id: 'notif-001', read: true });
    const newOne = makeNotification({ id: 'notif-002', read: false });

    mockFetch.mockResolvedValueOnce({ items: [old], unread_count: 0 });
    mockFetch.mockResolvedValueOnce({ items: [old, newOne], unread_count: 1 });

    const store = freshStore();
    // Primer fetch — inicializa
    await store.getState().fetchNotifications();
    // Segundo fetch — newOne es genuinamente nueva (id no visto antes)
    await store.getState().fetchNotifications();

    expect(store.getState().toastQueue).toHaveLength(1);
    expect(store.getState().toastQueue[0].id).toBe('notif-002');
  });

  it('N4: dismissToast elimina el primer elemento del toastQueue', async () => {
    const n1 = makeNotification({ id: 'n1' });
    const n2 = makeNotification({ id: 'n2' });
    mockFetch
      .mockResolvedValueOnce({ items: [], unread_count: 0 })       // primer fetch
      .mockResolvedValueOnce({ items: [n1, n2], unread_count: 2 }); // segundo fetch

    const store = freshStore();
    await store.getState().fetchNotifications();
    await store.getState().fetchNotifications();

    expect(store.getState().toastQueue).toHaveLength(2);
    store.getState().dismissToast();
    expect(store.getState().toastQueue).toHaveLength(1);
    expect(store.getState().toastQueue[0].id).toBe('n2');
  });

  it('N5: markAllRead marca todas como leídas y resetea unreadCount a 0', async () => {
    const n1 = makeNotification({ id: 'n1', read: false });
    const n2 = makeNotification({ id: 'n2', read: false });
    mockFetch.mockResolvedValue({ items: [n1, n2], unread_count: 2 });

    const store = freshStore();
    await store.getState().fetchNotifications();
    await store.getState().markAllRead();

    const state = store.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every((n: AppNotification) => n.read)).toBe(true);
    expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
  });
});
