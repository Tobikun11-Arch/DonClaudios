'use client';

import {createCustomerOrder, listMyOrders} from '@/lib/api/orderApi';
import {useMutation, useQuery} from '@tanstack/react-query';
import {SAFETY_REFETCH_MS, useRefetchOnChange} from '@/lib/hooks/sync/useRefetchOnChange';

export function useCreateCustomerOrderMutation() {
  return useMutation({
    mutationFn: createCustomerOrder
  });
}

export function useMyOrdersQuery() {
  useRefetchOnChange('orders', ['orders', 'me']);
  return useQuery({
    queryKey: ['orders', 'me'],
    queryFn: listMyOrders,
    refetchOnWindowFocus: false,
    refetchInterval: SAFETY_REFETCH_MS,
    staleTime: 1000
  });
}
