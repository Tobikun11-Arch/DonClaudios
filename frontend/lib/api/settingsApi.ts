import {httpClient} from './httpClient';
import type {
  GetSettingsResponse,
  SiteSetting,
  UpdateSettingsResponse,
  NotificationPreferences
} from '@/lib/types/settings';

export async function getSettings() {
  const res = await httpClient.get<GetSettingsResponse>('/settings');
  return res.data;
}

export async function updateSettings(body: Partial<SiteSetting>) {
  const res = await httpClient.put<UpdateSettingsResponse>('/settings', body);
  return res.data;
}

export async function getNotificationPreferences() {
  const res = await httpClient.get<{preferences: NotificationPreferences}>('/settings/notification-preferences');
  return res.data.preferences;
}

export async function updateNotificationPreferences(preferences: NotificationPreferences) {
  const res = await httpClient.put<{preferences: NotificationPreferences}>('/settings/notification-preferences', preferences);
  return res.data.preferences;
}
