'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  changePassword,
  getSessions,
  updateProfile,
  type UpdateProfileBody
} from '@/lib/api/authApi';
import {meQueryKey} from './useMeQuery';
import {settingsQueryKey} from '../useSettings';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => updateProfile(body),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: meQueryKey});
      // Business name/logo are served publicly via /settings (brandName/brandLogo).
      queryClient.invalidateQueries({queryKey: settingsQueryKey});
    }
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (body: {currentPassword: string; newPassword: string}) =>
      changePassword(body)
  });
}

export function useSessionsQuery() {
  return useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: getSessions,
    retry: false,
    refetchOnWindowFocus: false
  });
}
