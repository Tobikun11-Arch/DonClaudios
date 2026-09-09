'use client';

import {useQuery} from '@tanstack/react-query';
import {getStoreStatus} from '@/lib/api/storeStatusApi';

export const storeStatusQueryKey = ['store-status'] as const;

export function useStoreStatusQuery() {
  return useQuery({
    queryKey: storeStatusQueryKey,
    queryFn: getStoreStatus,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    refetchInterval: 60_000
  });
}