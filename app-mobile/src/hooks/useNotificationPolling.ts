import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useNotificationStore } from '../store/notificationStore';
import { registerPushToken } from '../api/notifications';

const POLL_INTERVAL_MS = 30_000;

export function useNotificationPolling() {
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const startPolling = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        fetchNotifications();
      }
    }, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Start polling
    startPolling();

    // Pause polling when app goes to background, resume on foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        fetchNotifications();
      }
    });

    // Register push token
    registerPushTokenAsync();

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, []);
}

async function registerPushTokenAsync() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // Android channel required for push notifications
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notificaciones',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F89937',
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await registerPushToken(tokenData.data);
  } catch {
    // Push token registration is best-effort — polling covers the fallback
  }
}
