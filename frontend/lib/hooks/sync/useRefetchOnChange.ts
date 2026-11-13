'use client';

import {useEffect, useRef} from 'react';
import {useQuery, useQueryClient, type QueryKey} from '@tanstack/react-query';
import {getChanges, type ChangeScope} from '@/lib/api/changesApi';

/** How often signed-in dashboards ask the backend "did anything change?". */
export const CHANGE_POLL_MS = 5000;
/** Slow safety refetch for heavy lists, in case a change is not fingerprinted. */
export const SAFETY_REFETCH_MS = 30_000;

const changesQueryKey = ['changes'] as const;

/**
 * Polls the cheap GET /changes endpoint and invalidates `queryKey` when the
 * fingerprint for `scope` changes. Replaces 5s polling of heavy lists: they
 * now refetch only when something actually changed (plus a slow safety net).
 */
export function useRefetchOnChange(
  scope: ChangeScope,
  queryKey: QueryKey,
  enabled = true
) {
  const queryClient = useQueryClient();
  const {data} = useQuery({
    queryKey: changesQueryKey,
    queryFn: getChanges,
    enabled,
    refetchInterval: CHANGE_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false
  });

  const value = data?.scopes?.[scope];
  const previous = useRef<string | undefined>(undefined);
  const keyString = JSON.stringify(queryKey);

  useEffect(() => {
    if (value === undefined) return;
    if (previous.current !== undefined && previous.current !== value) {
      void queryClient.invalidateQueries({queryKey: JSON.parse(keyString)});
    }
    previous.current = value;
  }, [value, keyString, queryClient]);
}
