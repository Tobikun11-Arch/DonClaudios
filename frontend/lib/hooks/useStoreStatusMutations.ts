'use client';

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
  toggleManualClose,
  updateStoreSettings
} from '@/lib/api/storeStatusApi';
import {storeStatusQueryKey} from './useStoreStatus';
import {meQueryKey} from './auth/useMeQuery';

export function useUpdateStoreSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStoreSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: storeStatusQueryKey});
      await queryClient.invalidateQueries({queryKey: meQueryKey});
    }
  });
}

export function useToggleManualCloseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleManualClose,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: storeStatusQueryKey});
      await queryClient.invalidateQueries({queryKey: meQueryKey});
    }
  });
}