'use client';

import {
  createCategory,
  deleteCategory,
  listCategories,
  listPublicCategories,
  updateCategory
} from '@/lib/api/categoriesApi';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const categoriesQueryKey = ['categories'] as const;
export const publicCategoriesQueryKey = ['categories', 'public'] as const;

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: listCategories,
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });
}

export function usePublicCategoriesQuery() {
  return useQuery({
    queryKey: publicCategoriesQueryKey,
    queryFn: listPublicCategories,
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: categoriesQueryKey});
    }
  });
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: categoriesQueryKey});
    }
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: categoriesQueryKey});
    }
  });
}