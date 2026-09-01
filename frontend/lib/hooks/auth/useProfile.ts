'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  changePassword,
  getSessions,
  updateProfile,
  type UpdateProfileBody
} from '@/lib/api/authApi';
import {meQueryKey} from './useMeQuery';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => updateProfile(body),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: meQueryKey});
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
