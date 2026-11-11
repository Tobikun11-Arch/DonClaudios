'use client';

import {
  listAdminOrderMessages,
  listFollowUpOrders,
  listOrderMessages,
  sendAdminOrderMessage,
  sendOrderMessage
} from '@/lib/api/orderApi';
import {
  adminNotificationsQueryKey,
  notificationsQueryKey
} from '@/lib/hooks/notifications/useNotifications';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

const orderMessagesKey = (orderId: string) =>
  ['orders', orderId, 'messages'] as const;
const followUpOrdersKey = ['orders', 'follow-up'] as const;

/** `asGuest`: a guest following up from their order page (no account). */
export function useOrderMessagesQuery(orderId: string, enabled: boolean, asGuest = false) {
  return useQuery({
    queryKey: orderMessagesKey(orderId),
    queryFn: () => listOrderMessages(orderId, asGuest),
    enabled,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useAdminOrderMessagesQuery(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: orderMessagesKey(orderId),
    queryFn: () => listAdminOrderMessages(orderId),
    enabled,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useSendOrderMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({orderId, body, asGuest}: {orderId: string; body: string; asGuest?: boolean}) =>
      sendOrderMessage(orderId, body, asGuest),
    onSuccess: async ({message}) => {
      await queryClient.invalidateQueries({queryKey: orderMessagesKey(message.orderId)});
      await queryClient.invalidateQueries({queryKey: adminNotificationsQueryKey});
      await queryClient.invalidateQueries({queryKey: followUpOrdersKey});
    }
  });
}

export function useSendAdminOrderMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({orderId, body}: {orderId: string; body: string}) =>
      sendAdminOrderMessage(orderId, body),
    onSuccess: async ({message}) => {
      await queryClient.invalidateQueries({queryKey: orderMessagesKey(message.orderId)});
      await queryClient.invalidateQueries({queryKey: notificationsQueryKey});
      await queryClient.invalidateQueries({queryKey: followUpOrdersKey});
    }
  });
}

export function useFollowUpOrdersQuery() {
  return useQuery({
    queryKey: followUpOrdersKey,
    queryFn: listFollowUpOrders,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}
