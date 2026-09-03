'use client';

import {
  listAllOrders,
  updateOrderStatus
} from '@/lib/api/orderApi';
import {sendAdminOrderMessage} from '@/lib/api/orderApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {cashierNotificationsQueryKey} from '@/lib/hooks/notifications/useNotifications';

export const allOrdersQueryKey = ['orders', 'all'] as const;
const followUpOrdersKey = ['orders', 'follow-up'] as const;
const orderMessagesKey = (orderId: string) =>
  ['orders', orderId, 'messages'] as const;

export function useAllOrdersQuery() {
  return useQuery({
    queryKey: allOrdersQueryKey,
    queryFn: listAllOrders,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({orderId, status}: {orderId: string; status: string}) =>
      updateOrderStatus(orderId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: allOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: followUpOrdersKey});
      await queryClient.invalidateQueries({queryKey: cashierNotificationsQueryKey});
    }
  });
}

export function useSendCashierOrderMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({orderId, body}: {orderId: string; body: string}) =>
      sendAdminOrderMessage(orderId, body),
    onSuccess: async ({message}) => {
      await queryClient.invalidateQueries({queryKey: orderMessagesKey(message.orderId)});
      await queryClient.invalidateQueries({queryKey: followUpOrdersKey});
      await queryClient.invalidateQueries({queryKey: allOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: cashierNotificationsQueryKey});
    }
  });
}