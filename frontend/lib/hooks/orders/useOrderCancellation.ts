'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  declineCancelRequest,
  fetchCancelQuote,
  markCashRefunded,
  updateOrderStatus
} from '@/lib/api/orderApi';

/*
 * Cancellation & refund policy (lib/payment/refundPolicy.ts). Every action
 * here touches several lists (orders, pre-orders, payment summaries, the
 * customer's tracking page), so successes refresh all order queries.
 */

export function useCancelQuoteQuery(
  orderId: string,
  opts: {by?: 'store' | 'customer' | 'no_show'; phoneNumber?: string; enabled?: boolean} = {}
) {
  return useQuery({
    queryKey: ['orders', orderId, 'cancel-quote', opts.by ?? 'customer', opts.phoneNumber ?? ''],
    queryFn: () => fetchCancelQuote(orderId, {by: opts.by, phoneNumber: opts.phoneNumber}),
    enabled: (opts.enabled ?? true) && !!orderId,
    staleTime: 0
  });
}

function useRefreshOrders() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({queryKey: ['orders']});
    await queryClient.invalidateQueries({queryKey: ['preorders']});
    await queryClient.invalidateQueries({queryKey: ['owner', 'orders']});
  };
}

/** Staff cancel. cancelledBy decides the refund policy. */
export function useStaffCancelOrderMutation() {
  const refresh = useRefreshOrders();
  return useMutation({
    mutationFn: (input: {
      orderId: string;
      reason?: string;
      cancelledBy: 'store' | 'customer' | 'no_show';
    }) =>
      updateOrderStatus(input.orderId, 'cancelled', {
        reason: input.reason,
        cancelledBy: input.cancelledBy
      }),
    onSuccess: refresh
  });
}

export function useDeclineCancelRequestMutation() {
  const refresh = useRefreshOrders();
  return useMutation({
    mutationFn: (input: {orderId: string; note?: string}) =>
      declineCancelRequest(input.orderId, input.note),
    onSuccess: refresh
  });
}

export function useMarkCashRefundedMutation() {
  const refresh = useRefreshOrders();
  return useMutation({
    mutationFn: (orderId: string) => markCashRefunded(orderId),
    onSuccess: refresh
  });
}
