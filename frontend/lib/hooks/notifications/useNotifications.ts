'use client';

import {
  deleteAdminNotification,
  deleteNotification,
  listAdminNotifications,
  listMyNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  markAllNotificationsRead,
  markNotificationRead
} from '@/lib/api/notificationsApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const notificationsQueryKey = ['notifications'] as const;
export const adminNotificationsQueryKey = ['notifications', 'admin'] as const;

export function useMyNotificationsQuery() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: listMyNotifications,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKey
      });
    }
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKey
      });
    }
  });
}

export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKey
      });
    }
  });
}

export function useAdminNotificationsQuery() {
  return useQuery({
    queryKey: adminNotificationsQueryKey,
    queryFn: listAdminNotifications,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useMarkAdminNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAdminNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminNotificationsQueryKey
      });
    }
  });
}

export function useMarkAllAdminNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllAdminNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminNotificationsQueryKey
      });
    }
  });
}

export function useDeleteAdminNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminNotificationsQueryKey
      });
    }
  });
}
