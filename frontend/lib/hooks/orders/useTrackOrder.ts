'use client';

import {
  cancelTrackedOrder,
  getTrackedOrder,
  submitOrderPayment,
  verifyOrderPayment,
  type SubmitPaymentInput
} from '@/lib/api/orderApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';


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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trackOrderKey(orderId, phoneNumber)
      });
      await queryClient.invalidateQueries({queryKey: myOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: allOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: followUpOrdersKey});
    }
  });
}

export function useSubmitPaymentMutation(
  orderId: string,
  phoneNumber?: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitPaymentInput) =>
      submitOrderPayment(orderId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trackOrderKey(orderId, phoneNumber)
      });
      await queryClient.invalidateQueries({queryKey: myOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: allOrdersQueryKey});
    }
  });
}

export function useVerifyPaymentMutation(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (verified: boolean) => verifyOrderPayment(orderId, verified),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: allOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: myOrdersQueryKey});
      await queryClient.invalidateQueries({queryKey: followUpOrdersKey});
    }
  });
}