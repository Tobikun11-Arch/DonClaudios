'use client';

import {
  createCounterOrder,
  listCounterOrders,
  voidCounterOrder,
  markCounterOrderPaid,
  updateCounterOrder
} from '@/lib/api/orderApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {CreateCounterOrderInput} from '@/lib/api/orderApi';

export const counterOrdersQueryKey = ['orders', 'counter'] as const;

export function useCounterOrdersQuery() {
  return useQuery({
    queryKey: counterOrdersQueryKey,
    queryFn: listCounterOrders,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useCreateCounterOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCounterOrder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: counterOrdersQueryKey
      });
    }
  });
}

export function useVoidCounterOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidCounterOrder,
    onSuccess: async ({order}) => {
      await queryClient.invalidateQueries({
        queryKey: counterOrdersQueryKey
      });
      await queryClient.invalidateQueries({
        queryKey: ['orders', String(order._id)]
      });
    }
  });
}

export function useMarkCounterOrderPaidMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markCounterOrderPaid,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: counterOrdersQueryKey
      });
    }
  });
}

export function useUpdateCounterOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({orderId, body}: {orderId: string; body: CreateCounterOrderInput}) =>
      updateCounterOrder(orderId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: counterOrdersQueryKey
      });
    }
  });
}
