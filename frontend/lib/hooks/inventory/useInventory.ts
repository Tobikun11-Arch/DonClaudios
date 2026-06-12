'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  adjustProduct,
  listMovements,
  restockProduct
} from '@/lib/api/inventoryApi';
import {productsQueryKey} from '../products/useProducts';

export const movementsQueryKey = (productId?: string) =>
  productId ? ['movements', productId] : ['movements'];

export function useMovementsQuery(productId?: string) {
  return useQuery({
    queryKey: movementsQueryKey(productId),
    queryFn: () => listMovements(productId),
    enabled: productId ? productId.length > 0 : true,
    refetchOnWindowFocus: false,
    staleTime: 15_000
  });
}

export function useRestockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({productId, ...body}: {productId: string} & {quantity: number; note?: string}) =>
      restockProduct(productId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: productsQueryKey});
      await queryClient.invalidateQueries({queryKey: ['movements']});
    }
  });
}

export function useAdjustMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({productId, ...body}: {productId: string} & {quantity: number; reason: 'spoilage' | 'adjustment'; note?: string}) =>
      adjustProduct(productId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: productsQueryKey});
      await queryClient.invalidateQueries({queryKey: ['movements']});
    }
  });
}
