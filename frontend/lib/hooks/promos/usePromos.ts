'use client';

import {
  createPromo,
  deletePromo,
  getPromo,
  listPromos,
  listPromosAdmin,
  updatePromo
} from '@/lib/api/promosApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const promosQueryKey = ['promos'] as const;
export const publicPromosQueryKey = ['promos', 'public'] as const;
export const promoQueryKey = (id: string) => ['promos', id] as const;

export function usePromosQuery() {
  return useQuery({
    queryKey: promosQueryKey,
    queryFn: listPromosAdmin,
    refetchOnWindowFocus: false,
    staleTime: 15_000
  });
}

export function usePublicPromosQuery() {
  return useQuery({
    queryKey: publicPromosQueryKey,
    queryFn: listPromos,
    refetchOnWindowFocus: false,
    staleTime: 15_000
  });
}

export function usePromoQuery(id?: string) {
  const safeId = id ?? '';

  return useQuery({
    queryKey: promoQueryKey(safeId),
    queryFn: () => getPromo(safeId),
    enabled: safeId.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 15_000
  });
}

export function useCreatePromoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPromo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: promosQueryKey});
    }
  });
}

export function useUpdatePromoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePromo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: promosQueryKey});
    }
  });
}

export function useDeletePromoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePromo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: promosQueryKey});
    }
  });
}
