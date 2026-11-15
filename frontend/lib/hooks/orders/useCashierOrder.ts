'use client';

import {
  listAllOrders,
  updateOrderStatus,
  getOrderById,
  markOnlineOrderPaid,
  type ListAllOrdersParams
} from '@/lib/api/orderApi';
import {sendAdminOrderMessage} from '@/lib/api/orderApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {cashierNotificationsQueryKey} from '@/lib/hooks/notifications/useNotifications';
import {counterOrdersQueryKey} from './useCashierCounterOrder';
import {SAFETY_REFETCH_MS, useRefetchOnChange} from '@/lib/hooks/sync/useRefetchOnChange';

export const allOrdersQueryKey = ['orders', 'all'] as const;
const orderDetailKey = (orderId: string) => ['orders', orderId] as const;
const followUpOrdersKey = ['orders', 'follow-up'] as const;
const orderMessagesKey = (orderId: string) =>
  ['orders', orderId, 'messages'] as const;

export function useOrderDetailQuery(orderId: string) {
  useRefetchOnChange('orders', orderDetailKey(orderId), !!orderId);
  return useQuery({
    queryKey: orderDetailKey(orderId),
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
    refetchOnWindowFocus: false,
    refetchInterval: SAFETY_REFETCH_MS,
    staleTime: 1000
  });
}

const DAY_MS = 86_400_000;

function toIsoDay(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Server params for the cashier list. With no date range the server returns
 * only the live queue (active orders + the last 7 days) instead of the whole
 * history. With a range it returns that range, padded by a day on each side
 * so timezone differences never drop an order; the page then filters to the
 * exact range.
 */
function cashierListParams(range?: {from: number | null; to: number | null}): ListAllOrdersParams {
  if (!range || (range.from === null && range.to === null)) return {scope: 'queue'};
  const from = range.from ?? Date.UTC(2000, 0, 1);
  const to = range.to ?? Date.now();
  return {preset: 'custom', from: toIsoDay(from - DAY_MS), to: toIsoDay(to + DAY_MS)};
}

export function useAllOrdersQuery(range?: {from: number | null; to: number | null}) {
  const params = cashierListParams(range);
  const queryKey = [...allOrdersQueryKey, params] as const;
  useRefetchOnChange('orders', queryKey);
  return useQuery({
    queryKey,
    queryFn: () => listAllOrders(params),
    refetchOnWindowFocus: false,
    refetchInterval: SAFETY_REFETCH_MS,
    staleTime: 1000,
    // Keep the current rows on screen while a new date range loads.
    placeholderData: data => data
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({orderId, status}: {orderId: string; status: string}) =>
      updateOrderStatus(orderId, status),
    onSuccess: async ({order}) => {
      await queryClient.invalidateQueries({queryKey: allOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: counterOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: followUpOrdersKey});
      await queryClient.invalidateQueries({
        queryKey: orderDetailKey(order._id)
      });
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
      await queryClient.invalidateQueries({queryKey: counterOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: cashierNotificationsQueryKey});
    }
  });
}

export function useMarkOnlineOrderPaidMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => markOnlineOrderPaid(orderId),
    onSuccess: async ({order}) => {
      await queryClient.invalidateQueries({queryKey: allOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: counterOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: followUpOrdersKey});
      await queryClient.invalidateQueries({queryKey: orderDetailKey(order._id)});
      await queryClient.invalidateQueries({queryKey: cashierNotificationsQueryKey});
    }
  });
}