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
import {allOrdersQueryKey} from './useCashierOrder';
import type {ReportPreset} from '@/lib/types/report';

export const counterOrdersQueryKey = ['orders', 'counter'] as const;

export function counterOrdersQueryKeyFor(params?: {
  status?: string;
  preset?: ReportPreset | 'custom';
  from?: string;
  to?: string;
}) {
  return [...counterOrdersQueryKey, params ?? {}] as const;
}

export function useCounterOrdersQuery(params?: {
  status?: string;
  preset?: ReportPreset | 'custom';
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: counterOrdersQueryKeyFor(params),
    queryFn: () => listCounterOrders(params),
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
      await queryClient.invalidateQueries({
        queryKey: allOrdersQueryKey
      });
      await queryClient.invalidateQueries({
        queryKey: ['owner', 'orders']
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
        queryKey: allOrdersQueryKey
      });
      await queryClient.invalidateQueries({
        queryKey: ['owner', 'orders']
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
    mutationFn: ({
      orderId,
      paymentMethod
    }: {
      orderId: string;
      paymentMethod: 'cash' | 'card' | 'gcash' | 'other';
    }) => markCounterOrderPaid(orderId, paymentMethod),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: counterOrdersQueryKey
      });
      await queryClient.invalidateQueries({
        queryKey: allOrdersQueryKey
      });
      await queryClient.invalidateQueries({
        queryKey: ['owner', 'orders']
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
      await queryClient.invalidateQueries({
        queryKey: allOrdersQueryKey
      });
      await queryClient.invalidateQueries({
        queryKey: ['owner', 'orders']
      });
    }
  });
}
