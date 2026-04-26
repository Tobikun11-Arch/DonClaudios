'use client';

import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct
} from '@/lib/api/productsApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const productsQueryKey = ['products'] as const;
export const productQueryKey = (id: string) => ['products', id] as const;

export function useProductsQuery() {
  return useQuery({
    queryKey: productsQueryKey,
    queryFn: listProducts,
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
      await queryClient.invalidateQueries({queryKey: productsQueryKey});
    }
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: productsQueryKey});
    }
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: productsQueryKey});
    }
  });
}
