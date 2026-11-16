'use client';

import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  adjustProduct,
  listInventoryProducts,
  listMovements,
  restockProduct
} from '@/lib/api/inventoryApi';
import type {InventoryProductsParams} from '@/lib/types/inventory';
import {PRODUCTS_QUERY_PREFIX} from '../products/useProducts';

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

/**
 * Paginated inventory table. Keyed under the shared `products` prefix so every
 * product/stock mutation (which invalidates that prefix) refreshes it too.
 * `keepPreviousData` keeps the current page on screen while the next loads.
 */
export function useInventoryProductsQuery(params: InventoryProductsParams) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_PREFIX, 'inventory-page', params],
    queryFn: () => listInventoryProducts(params),
    placeholderData: keepPreviousData,
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
      await queryClient.invalidateQueries({queryKey: PRODUCTS_QUERY_PREFIX});
      await queryClient.invalidateQueries({queryKey: ['movements']});
      await queryClient.invalidateQueries({queryKey: ['dashboard', 'inventory-by-category']});
      await queryClient.invalidateQueries({queryKey: ['dashboard', 'low-stock']});
    }
  });
}

export function useAdjustMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({productId, ...body}: {productId: string} & {quantity: number; reason: 'spoilage' | 'adjustment'; note?: string}) =>
      adjustProduct(productId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: PRODUCTS_QUERY_PREFIX});
      await queryClient.invalidateQueries({queryKey: ['movements']});
      await queryClient.invalidateQueries({queryKey: ['dashboard', 'inventory-by-category']});
      await queryClient.invalidateQueries({queryKey: ['dashboard', 'low-stock']});
    }
  });
}

