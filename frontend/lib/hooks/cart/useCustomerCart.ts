'use client';

import {
  addCartItem,
  clearMyCart,
  getMyCart,
  removeCartItem,
  setCartItemQuantity
} from '@/lib/api/cartApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const customerCartQueryKey = ['cart', 'me'] as const;

export function useCustomerCartQuery(enabled = true) {
  return useQuery({
    queryKey: customerCartQueryKey,
    queryFn: getMyCart,
    enabled,
    refetchOnWindowFocus: false
  });
}

export function useAddCustomerCartItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addCartItem,
    onSuccess: async () => {
      await qc.invalidateQueries({queryKey: customerCartQueryKey});
    }
  });
}

export function useSetCustomerCartItemQuantityMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setCartItemQuantity,
    onSuccess: async () => {
      await qc.invalidateQueries({queryKey: customerCartQueryKey});
    }
  });
}

export function useRemoveCustomerCartItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeCartItem,
    onSuccess: async () => {
      await qc.invalidateQueries({queryKey: customerCartQueryKey});
    }
  });
}

export function useClearCustomerCartMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clearMyCart,
    onSuccess: async () => {
      await qc.invalidateQueries({queryKey: customerCartQueryKey});
    }
  });
}
