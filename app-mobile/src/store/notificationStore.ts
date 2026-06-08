import { create } from 'zustand';
import {
  AppNotification,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/notifications';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  toastQueue: AppNotification[];
  // IDs ya vistos — detectar notificaciones genuinamente nuevas
  seenIds: Set<string>;
  // Primer fetch ya ocurrió — evita spam de toasts con notificaciones históricas
  isInitialized: boolean;

  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismissToast: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  toastQueue: [],
  seenIds: new Set(),
  isInitialized: false,

  fetchNotifications: async () => {
    try {
      const data = await fetchNotifications();
      const { seenIds, toastQueue, isInitialized } = get();

      const updatedSeenIds = new Set(seenIds);
      data.items.forEach((n) => updatedSeenIds.add(n.id));

      // En el primer fetch solo inicializamos seenIds — no disparamos toasts
      // para notificaciones históricas que ya existían antes de abrir la app.
      const newOnes = isInitialized
        ? data.items.filter((n) => !seenIds.has(n.id) && !n.read)
        : [];

      set({
        notifications: data.items,
        unreadCount: data.unread_count,
        seenIds: updatedSeenIds,
        isInitialized: true,
        toastQueue:
          newOnes.length > 0
            ? [...toastQueue, ...newOnes.filter((n) => !toastQueue.find((q) => q.id === n.id))]
            : toastQueue,
      });
    } catch {
      // Ignorar errores de red durante el polling — no crashear
    }
  },

  markRead: async (id: string) => {
    await markNotificationRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await markAllNotificationsRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  dismissToast: () => {
    set((state) => ({ toastQueue: state.toastQueue.slice(1) }));
  },
}));
