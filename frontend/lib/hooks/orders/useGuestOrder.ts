'use client';

import {createGuestOrder} from '@/lib/api/orderApi';
import {useMutation} from '@tanstack/react-query';

export function useCreateGuestOrderMutation() {
  return useMutation({
    mutationFn: createGuestOrder
  });
}
