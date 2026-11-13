'use client';

import {useMeQuery} from './auth/useMeQuery';
import {useSettingsQuery} from './useSettings';

export const DEFAULT_LOGO = '/assets/logo.png';
export const DEFAULT_NAME = "DonClaudio's Lechon House";

/**
 * Branding from the public settings only (GET /settings exposes the owner's
 * business name/logo as brandName/brandLogo). Use this on signed-out pages:
 * it doesn't subscribe to /auth/me, whose failed query would refetch on every
 * mount there.
 */
export function usePublicBrand() {
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data;

  return {
    name: settings?.brandName || settings?.footer?.brandName || DEFAULT_NAME,
    logo: settings?.brandLogo || DEFAULT_LOGO,
    // Only the placeholder defaults so far (first settings load).
    isPending: settingsQuery.isPlaceholderData
  };
}

export function useBrand() {
  const meQuery = useMeQuery();
  const brand = usePublicBrand();
  const user = meQuery.data?.user;

  return {
    name: user?.businessName || brand.name,
    logo: user?.businessLogo || brand.logo,
    isPending: !user?.businessLogo && brand.isPending
  };
}
