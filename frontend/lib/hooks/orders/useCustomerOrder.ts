'use client';

import {createCustomerOrder} from '@/lib/api/orderApi';
import {useMutation} from '@tanstack/react-query';

export function useCreateCustomerOrderMutation() {
  return useMutation({
    mutationFn: createCustomerOrder
  });
}
