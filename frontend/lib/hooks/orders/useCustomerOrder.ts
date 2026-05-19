'use client';

import {createCustomerOrder, listMyOrders} from '@/lib/api/orderApi';
import {useMutation, useQuery} from '@tanstack/react-query';

export function useCreateCustomerOrderMutation() {
  return useMutation({
    mutationFn: createCustomerOrder
  });
}

export function useMyOrdersQuery() {
  return useQuery({
    queryKey: ['orders', 'me'],
    queryFn: listMyOrders,
    refetchOnWindowFocus: false
  });
}
