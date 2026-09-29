'use client';

import {useMeQuery} from './auth/useMeQuery';

export const FALLBACK_PREP_MINUTES = 20;

export function useDefaultPrepMinutes() {
  const {data} = useMeQuery();
  const value = data?.user?.defaultPrepMinutes;
  return typeof value === 'number' && value > 0 ? value : FALLBACK_PREP_MINUTES;
}
