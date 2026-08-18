import {httpClient} from './httpClient';
import type {
  GetSettingsResponse,
  SiteSetting,
  UpdateSettingsResponse
} from '@/lib/types/settings';

export async function getSettings() {
  const res = await httpClient.get<GetSettingsResponse>('/settings');
  return res.data;
}

export async function updateSettings(body: Partial<SiteSetting>) {
  const res = await httpClient.put<UpdateSettingsResponse>('/settings', body);
  return res.data;
}
