'use client';

import {
  deleteAdminNotification,
  deleteCashierNotification,
  deleteNotification,
  listAdminNotifications,
  listCashierNotifications,
  listMyNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  markAllCashierNotificationsRead,
  markAllNotificationsRead,
  markCashierNotificationRead,
  markNotificationRead
} from '@/lib/api/notificationsApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const notificationsQueryKey = ['notifications'] as const;
export const adminNotificationsQueryKey = ['notifications', 'admin'] as const;
export const cashierNotificationsQueryKey = ['notifications', 'cashier'] as const;

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

export function useCashierNotificationsQuery() {
  return useQuery({
    queryKey: cashierNotificationsQueryKey,
    queryFn: listCashierNotifications,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useMarkCashierNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markCashierNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: cashierNotificationsQueryKey
      });
    }
  });
}

export function useMarkAllCashierNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllCashierNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: cashierNotificationsQueryKey
      });
    }
  });
}

export function useDeleteCashierNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCashierNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: cashierNotificationsQueryKey
      });
    }
  });
}
