import {httpClient} from './httpClient';
import type {
  GetSettingsResponse,
  SiteSetting,
  UpdateSettingsResponse,
  NotificationPreferences,
  DashboardTheme
} from '@/lib/types/settings';

export async function getSettings() {
  const res = await httpClient.get<GetSettingsResponse>('/settings');
  return res.data;
}

export async function updateSettings(body: Partial<SiteSetting>) {
  const res = await httpClient.put<UpdateSettingsResponse>('/settings', body);
  return res.data;
}

export async function updateDashboardTheme(body: DashboardTheme) {
  const res = await httpClient.put<{dashboardTheme: DashboardTheme}>(
    '/settings/dashboard-theme',
    body
  );
  return res.data.dashboardTheme;
}

export async function getNotificationPreferences() {
  const res = await httpClient.get<{preferences: NotificationPreferences}>('/settings/notification-preferences');
  return res.data.preferences;
}

export async function updateNotificationPreferences(preferences: NotificationPreferences) {
  const res = await httpClient.put<{preferences: NotificationPreferences}>('/settings/notification-preferences', preferences);
  return res.data.preferences;
}

export type FreeDeliveryResponse = {
  freeDelivery: import('@/lib/orders/deliveryMode').FreeDeliverySettings;
  /** The built-in defaults, for "reset to default" in Settings. */
  defaults: import('@/lib/orders/deliveryMode').FreeDeliverySettings;
};

export async function getFreeDeliverySettings() {
  const res = await httpClient.get<FreeDeliveryResponse>('/settings/free-delivery');
  return res.data;
}

export async function updateFreeDeliverySettings(
  body: import('@/lib/orders/deliveryMode').FreeDeliverySettings
) {
  const res = await httpClient.put<FreeDeliveryResponse>('/settings/free-delivery', body);
  return res.data;
}

export type RewardsEarnResponse = {
  rewardsEarn: import('@/config/rewards').RewardsEarnRule;
  /** The built-in defaults (1 point per ₱1). */
  defaults: import('@/config/rewards').RewardsEarnRule;
};

export async function getRewardsEarnSettings() {
  const res = await httpClient.get<RewardsEarnResponse>('/settings/rewards-earn');
  return res.data;
}

export async function updateRewardsEarnSettings(
  body: import('@/config/rewards').RewardsEarnRule
) {
  const res = await httpClient.put<RewardsEarnResponse>('/settings/rewards-earn', body);
  return res.data;
}
