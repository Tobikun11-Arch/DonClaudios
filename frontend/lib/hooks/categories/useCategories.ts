'use client';

import {
  createCategory,
  deleteCategory,
  listCategories,
  listPublicCategories,
  reorderCategories,
  updateCategory
} from '@/lib/api/categoriesApi';
import type {ListCategoriesResponse} from '@/lib/types/category';
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

/** Moves categories instantly, then saves; rolls back if the save fails. */
export function useReorderCategoriesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderCategories,
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({queryKey: categoriesQueryKey});
      const previous = queryClient.getQueryData<ListCategoriesResponse>(categoriesQueryKey);
      if (previous) {
        const byId = new Map(previous.categories.map(c => [c._id, c]));
        queryClient.setQueryData<ListCategoriesResponse>(categoriesQueryKey, {
          categories: ids
            .map((id, index) => {
              const c = byId.get(id);
              return c ? {...c, sortOrder: index} : null;
            })
            .filter((c): c is NonNullable<typeof c> => c !== null)
        });
      }
      return {previous};
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(categoriesQueryKey, context.previous);
    },
    onSettled: async () => {
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