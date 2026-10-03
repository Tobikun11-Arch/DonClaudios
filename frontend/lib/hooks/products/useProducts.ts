'use client';

import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct
} from '@/lib/api/productsApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';

/** Prefix shared by every products cache entry, for invalidation. */
export const PRODUCTS_QUERY_PREFIX = ['products'] as const;

/**
 * The key includes whether the viewer is signed in, because the server
 * returns a different product set: pre-order items are hidden from guests.
 * Without this, a cache built while logged in would still show them after
 * signing out.
 */
export const productsQueryKey = (isSignedIn: boolean) =>
  ['products', isSignedIn ? 'member' : 'guest'] as const;
export const productQueryKey = (id: string) => ['product', id] as const;

export function useProductsQuery() {
  const {data: me, isLoading: meLoading} = useMeQuery();
  const isSignedIn = !!me;

  return useQuery({
    queryKey: productsQueryKey(isSignedIn),
    queryFn: listProducts,
    // Wait for the session check so we never paint a guest view that
    // briefly contains pre-order items.
    enabled: !meLoading,
    refetchOnWindowFocus: false,
    staleTime: 15_000
  });
}

export function useProductQuery(id?: string) {
  const safeId = id ?? '';

  return useQuery({
    queryKey: productQueryKey(safeId),
    queryFn: () => getProduct(safeId),
    enabled: safeId.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 15_000
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: PRODUCTS_QUERY_PREFIX});
    }
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: PRODUCTS_QUERY_PREFIX});
    }
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: PRODUCTS_QUERY_PREFIX});
    }
  });
}

