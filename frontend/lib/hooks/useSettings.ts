'use client';

import {getSettings, updateSettings} from '@/lib/api/settingsApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const settingsQueryKey = ['settings'] as const;

export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: getSettings,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: settingsQueryKey});
    }
  });
}
