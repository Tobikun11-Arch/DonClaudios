'use client';

import {
  cancelTrackedOrder,
  getTrackedOrder
} from '@/lib/api/orderApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

const TERMINAL_STATUSES = ['completed', 'cancelled'] as const;
type TrackStatus = (typeof TERMINAL_STATUSES)[number];

const trackOrderKey = (orderId: string, phoneNumber?: string) =>
  ['orders', 'track', orderId, phoneNumber ?? ''] as const;

export function useTrackOrderQuery(orderId: string, phoneNumber?: string) {
  const enabled = !!orderId && phoneNumber !== '';
  return useQuery({
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
}

export function useCancelTrackedOrderMutation(
  orderId: string,
  phoneNumber?: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      cancelTrackedOrder(orderId, reason, phoneNumber),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trackOrderKey(orderId, phoneNumber)
      });
    }
  });
}