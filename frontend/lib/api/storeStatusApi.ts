import {httpClient} from './httpClient';

export type StoreStatus = {
  isOpen: boolean;
  closingTime: string;
  advanceCloseMinutes: number;
  isManuallyClosed: boolean;
  manualCloseReason: string;
  closesAt: string;
  reason?: string;
  reopenMessage: string;
};

type GetStoreStatusResponse = {
  status: StoreStatus;
};

type UpdateStoreSettingsBody = {
  closingTime?: string;
  advanceCloseMinutes?: number;
  isManuallyClosed?: boolean;
  manualCloseReason?: string;
};

type UpdateStoreSettingsResponse = {
  settings: {
    closingTime: string;
    advanceCloseMinutes: number;
    isManuallyClosed: boolean;
    manualCloseReason: string;
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
  reason?: string;
}) {
  const res = await httpClient.patch<UpdateStoreSettingsResponse>(
    '/store-status/manual',
    body
  );
  return res.data;
}