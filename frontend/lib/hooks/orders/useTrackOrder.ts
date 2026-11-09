'use client';

import {useEffect} from 'react';
import {
  cancelTrackedOrder,
  getTrackedOrder,
  submitCashPayment,
  fetchPaymentSummary,
  startPaymentCheckout,
  payOrderBalance,
  type PaymentChannel
} from '@/lib/api/orderApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {updateGuestOrderHistoryEntry} from '@/lib/orders/orderHistoryStorage';

const TERMINAL_STATUSES = ['completed', 'cancelled'] as const;
type TrackStatus = (typeof TERMINAL_STATUSES)[number];

export const allOrdersQueryKey = ['orders', 'all'] as const;
export const myOrdersQueryKey = ['orders', 'me'] as const;
export const followUpOrdersKey = ['orders', 'follow-up'] as const;

const trackOrderKey = (orderId: string, phoneNumber?: string) =>
  ['orders', 'track', orderId, phoneNumber ?? ''] as const;

export function useTrackOrderQuery(
  orderId: string,
  phoneNumber?: string,
  email?: string
) {
  const enabled = !!orderId && (phoneNumber !== '' || email !== '');
  const query = useQuery({
    queryKey: trackOrderKey(orderId, phoneNumber ?? email),
    queryFn: () => getTrackedOrder(orderId, phoneNumber, email),
    enabled,
    refetchOnWindowFocus: false,
    refetchInterval: query => {
      const status = query.state.data?.order?.orderStatus as
        | TrackStatus
        | undefined;
      if (!status) {
        return false;
      }
      if (TERMINAL_STATUSES.includes(status)) {
        return false;
      }
      return 5000;
    },
    staleTime: 1000
  });

  const trackedId = query.data?.order?._id;
  const trackedStatus = query.data?.order?.orderStatus;
  const trackedCancelReason = query.data?.order?.cancelReason;
  useEffect(() => {
    if (!trackedId || !trackedStatus) return;
    updateGuestOrderHistoryEntry({
      _id: trackedId,
      orderStatus: trackedStatus,
      cancelReason: trackedCancelReason
    });
  }, [trackedId, trackedStatus, trackedCancelReason]);

  return query;
}

export function useCancelTrackedOrderMutation(
  orderId: string,
  phoneNumber?: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      cancelTrackedOrder(orderId, reason, phoneNumber),
    onSuccess: async data => {
      const updated = data?.order;
      if (updated) {
        updateGuestOrderHistoryEntry(updated);
      }
      await queryClient.invalidateQueries({
        queryKey: trackOrderKey(orderId, phoneNumber)
      });
      await queryClient.invalidateQueries({queryKey: myOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: allOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: followUpOrdersKey});
      await queryClient.invalidateQueries({queryKey: ['preorders']});
    }
  });
}

export const paymentSummaryKey = (orderId: string) =>
  ['orders', 'payment', orderId] as const;

/**
 * Payment step data (what is due, fee quotes, open invoice). Polls while an
 * invoice is open or while we wait for Xendit's webhook after the redirect.
 */
export function usePaymentSummaryQuery(
  orderId: string,
  phoneNumber: string | undefined,
  options: {enabled: boolean; awaitingConfirmation?: boolean}
) {
  return useQuery({
    queryKey: [...paymentSummaryKey(orderId), phoneNumber ?? ''],
    queryFn: () => fetchPaymentSummary(orderId, phoneNumber),
    enabled: !!orderId && options.enabled,
    refetchOnWindowFocus: true,
    refetchInterval: query => {
      const data = query.state.data;
      if (options.awaitingConfirmation) return 3000;
      if (data?.pendingPayment) return 5000;
      return false;
    },
    staleTime: 1000
  });
}

async function invalidateOrderQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string
) {
  await queryClient.invalidateQueries({queryKey: ['orders', 'track', orderId]});
  await queryClient.invalidateQueries({queryKey: paymentSummaryKey(orderId)});
  await queryClient.invalidateQueries({queryKey: myOrdersQueryKey});
  await queryClient.invalidateQueries({queryKey: allOrdersQueryKey});
  await queryClient.invalidateQueries({queryKey: followUpOrdersKey});
}

/** Creates the Xendit invoice and sends the browser to Xendit's checkout. */
export function useStartCheckoutMutation(orderId: string, phoneNumber?: string) {
  return useMutation({
    mutationFn: (input: {kind: 'full' | 'down_payment'; channel: PaymentChannel}) =>
      startPaymentCheckout(orderId, input, phoneNumber),
    onSuccess: data => {
      window.location.assign(data.invoiceUrl);
    }
  });
}

export function usePayBalanceMutation(orderId: string, phoneNumber?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: {method: 'online'; channel: PaymentChannel} | {method: 'cash'}
    ) => payOrderBalance(orderId, input, phoneNumber),
    onSuccess: async data => {
      if ('invoiceUrl' in data && data.invoiceUrl) {
        window.location.assign(data.invoiceUrl);
        return;
      }
      await invalidateOrderQueries(queryClient, orderId);
    }
  });
}

export function useSubmitCashPaymentMutation(
  orderId: string,
  phoneNumber?: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitCashPayment(orderId, phoneNumber),
    onSuccess: async () => {
      await invalidateOrderQueries(queryClient, orderId);
    }
  });
}
