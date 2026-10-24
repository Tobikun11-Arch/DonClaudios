import {httpClient} from './httpClient';

export type StoreStatus = {
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  advanceCloseMinutes: number;
  isManuallyClosed: boolean;
  isManuallyOpen: boolean;
  forceOpen?: boolean;
  manualOverride?: 'open' | 'closed' | null;
  closesAt: string;
  reason?: string;
  reopenMessage: string;
};

type GetStoreStatusResponse = {
  status: StoreStatus;
};

type UpdateStoreSettingsBody = {
  openingTime?: string;
  closingTime?: string;
  advanceCloseMinutes?: number;
  isManuallyClosed?: boolean;
  isManuallyOpen?: boolean;
  forceOpen?: boolean;
  manualOverride?: 'open' | 'closed' | null;
};

type UpdateStoreSettingsResponse = {
  settings: {
    openingTime: string;
    closingTime: string;
    advanceCloseMinutes: number;
    isManuallyClosed: boolean;
    isManuallyOpen: boolean;
    forceOpen?: boolean;
    manualOverride?: 'open' | 'closed' | null;
  };
};

export async function getStoreStatus() {
  const res = await httpClient.get<GetStoreStatusResponse>('/store-status');
  return res.data;
}

export async function updateStoreSettings(body: UpdateStoreSettingsBody) {
  const res = await httpClient.put<UpdateStoreSettingsResponse>(
    '/store-status',
    body
  );
  return res.data;
}

export async function toggleManualClose(body: {
  isManuallyClosed: boolean;
}) {
  const res = await httpClient.patch<UpdateStoreSettingsResponse>(
    '/store-status/manual',
    body
  );
  return res.data;
}

export async function toggleManualOpen(body: {
  isManuallyOpen: boolean;
}) {
  const res = await httpClient.patch<UpdateStoreSettingsResponse>(
    '/store-status/manual-open',
    body
  );
  return res.data;
}