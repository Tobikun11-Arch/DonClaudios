'use client';

import {getSettings, updateSettings} from '@/lib/api/settingsApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {SiteSetting} from '@/lib/types/settings';
import {DEFAULT_SETTINGS} from '@/features/owner/appearance/constants';

export const settingsQueryKey = ['settings'] as const;

export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: async (): Promise<SiteSetting> => {
      try {
        const res = await getSettings();
        return res.settings;
      } catch {
        return DEFAULT_SETTINGS;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    placeholderData: DEFAULT_SETTINGS
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SiteSetting>) => updateSettings(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: settingsQueryKey});
    }
  });
}
