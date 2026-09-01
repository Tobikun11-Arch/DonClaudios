import {httpClient} from './httpClient';
import type {
  DeleteNotificationResponse,
  ListNotificationsResponse,
  MarkAllReadResponse,
  NotificationResponse
} from '@/lib/types/notification';

export async function listMyNotifications() {
  const res = await httpClient.get<ListNotificationsResponse>('/notifications');
  return res.data;
}

export async function markNotificationRead(id: string) {
  const res = await httpClient.patch<NotificationResponse>(
    `/notifications/${id}/read`
  );
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await httpClient.patch<MarkAllReadResponse>(
    '/notifications/read-all'
  );
  return res.data;
}

export async function deleteNotification(id: string) {
  const res = await httpClient.delete<DeleteNotificationResponse>(
    `/notifications/${id}`
  );
  return res.data;
}

export async function listAdminNotifications() {
  const res = await httpClient.get<ListNotificationsResponse>(
    '/notifications/admin'
  );
  return res.data;
}

export async function markAdminNotificationRead(id: string) {
  const res = await httpClient.patch<NotificationResponse>(
    `/notifications/admin/${id}/read`
  );
  return res.data;
}

export async function markAllAdminNotificationsRead() {
  const res = await httpClient.patch<MarkAllReadResponse>(
    '/notifications/admin/read-all'
  );
  return res.data;
}

export async function deleteAdminNotification(id: string) {
  const res = await httpClient.delete<DeleteNotificationResponse>(
    `/notifications/admin/${id}`
  );
  return res.data;
}
