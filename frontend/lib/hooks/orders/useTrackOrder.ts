'use client';

import {useEffect} from 'react';
import {
  cancelTrackedOrder,
  getTrackedOrder
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

export function useTrackOrderQuery(orderId: string, phoneNumber?: string) {
  const enabled = !!orderId && phoneNumber !== '';
  const query = useQuery({
    queryKey: trackOrderKey(orderId, phoneNumber),
    queryFn: () => getTrackedOrder(orderId, phoneNumber),
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
    }
  });
}