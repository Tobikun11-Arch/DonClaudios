'use client';

import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  updateIngredient
} from '@/lib/api/ingredientsApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const ingredientsQueryKey = ['ingredients'] as const;

export function useIngredientsQuery() {
  return useQuery({
    queryKey: ingredientsQueryKey,
    queryFn: listIngredients,
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });
}

export function useCreateIngredientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createIngredient,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ingredientsQueryKey});
    }
  });
}

export function useUpdateIngredientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateIngredient,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ingredientsQueryKey});
    }
  });
}

export function useDeleteIngredientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteIngredient,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ingredientsQueryKey});
    }
  });
}