import {httpClient} from './httpClient';
import type {DownPaymentRules} from '@/lib/payment/downPaymentRules';
import type {
  GetSettingsResponse,
  SiteSetting,
  UpdateSettingsResponse,
  NotificationPreferences,
  DashboardTheme,
  DashboardTarget,
  DashboardThemes
} from '@/lib/types/settings';

export async function getSettings() {
  const res = await httpClient.get<GetSettingsResponse>('/settings');
  return res.data;
}

export async function updateSettings(body: Partial<SiteSetting>) {
  const res = await httpClient.put<UpdateSettingsResponse>('/settings', body);
  return res.data;
}

export async function updateDashboardTheme(
  body: DashboardTheme & {target: DashboardTarget}
) {
  const res = await httpClient.put<{dashboardTheme: DashboardThemes}>(
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

export type DownPaymentResponse = {
  /** Down payment rule per order flow (lib/payment/downPaymentRules.ts). */
  rules: DownPaymentRules;
  /** Pre-order percent (same as rules.preorder.percent). */
  downPaymentPercent: number;
  defaults: DownPaymentRules;
  /** PUT only: how many unpaid orders were moved to the new percent. */
  ordersUpdated?: number;
  limits: {default: number; min: number; max: number; minOrderMax: number};
};

/** Owner's down payment rules (public read). */
export async function getDownPaymentSettings() {
  const res = await httpClient.get<DownPaymentResponse>('/settings/down-payment');
  return res.data;
}

export async function updateDownPaymentSettings(body: {rules: DownPaymentRules}) {
  const res = await httpClient.put<DownPaymentResponse>('/settings/down-payment', body);
  return res.data;
}
