'use client';

import {useMeQuery} from './auth/useMeQuery';
import {useSettingsQuery} from './useSettings';

const DEFAULT_LOGO = '/assets/logo.png';
const DEFAULT_NAME = "DonClaudio's Lechon House";

export function useBrand() {
  const meQuery = useMeQuery();
  const settingsQuery = useSettingsQuery();

  const user = meQuery.data?.user;
  const settings = settingsQuery.data;

  const name =
    user?.businessName ||
    settings?.brandName ||
    settings?.footer?.brandName ||
    DEFAULT_NAME;

  const logo =
    user?.businessLogo ||
    settings?.brandLogo ||
    DEFAULT_LOGO;

  return {name, logo};
}