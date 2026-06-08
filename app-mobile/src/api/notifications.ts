import { apiClient } from './client';

export interface AppNotification {
  id: string;
  merchant_id: string;
  type: 'txn.approved' | 'txn.failed' | 'txn.refunded' | 'link.paid';
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, string>;
  created_at: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  unread_count: number;
}

export async function fetchNotifications(): Promise<NotificationListResponse> {
  const res = await apiClient.get<NotificationListResponse>('/v1/notifications');
  return res.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/v1/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/v1/notifications/read-all');
}

export async function registerPushToken(push_token: string): Promise<void> {
  await apiClient.post('/v1/notifications/push-token', { push_token });
}
