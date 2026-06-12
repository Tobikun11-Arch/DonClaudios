'use client';

import {
  createCashier,
  deleteCashier,
  getCashier,
  listCashiers,
  updateCashier
} from '@/lib/api/cashiersApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const cashiersQueryKey = ['cashiers'] as const;
export const cashierQueryKey = (id: string) => ['cashiers', id] as const;

export function useCashiersQuery() {
  return useQuery({
    queryKey: cashiersQueryKey,
    queryFn: listCashiers,
    refetchOnWindowFocus: false,
    staleTime: 15_000
  });
}

export function useCashierQuery(id?: string) {
  const safeId = id ?? '';

  return useQuery({
    queryKey: cashierQueryKey(safeId),
    queryFn: () => getCashier(safeId),
    enabled: safeId.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 15_000
  });
}

export function useCreateCashierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCashier,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: cashiersQueryKey});
    }
  });
}

export function useUpdateCashierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCashier,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: cashiersQueryKey});
    }
  });
}

export function useDeleteCashierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCashier,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: cashiersQueryKey});
    }
  });
}
