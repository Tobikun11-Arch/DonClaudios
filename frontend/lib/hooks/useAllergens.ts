'use client';

import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {createAllergen, deleteAllergen, listAllergens} from '@/lib/api/allergensApi';
import {
  BUILT_IN_ALLERGEN_OPTIONS,
  buildAllergenCatalog,
  type AllergenCatalog
} from '@/lib/ingredients/allergenCatalog';
import {PRODUCTS_QUERY_PREFIX} from '@/lib/hooks/products/useProducts';

export const ALLERGENS_QUERY_KEY = ['allergens'] as const;

export function useAllergensQuery() {
  return useQuery({
    queryKey: ALLERGENS_QUERY_KEY,
    queryFn: listAllergens,
    staleTime: 5 * 60 * 1000,
    // Built-ins are known up front, so the UI never waits on this request.
    placeholderData: BUILT_IN_ALLERGEN_OPTIONS
  });
}

/** Labels, icons and order for allergen keys, including owner-added ones. */
export function useAllergenCatalog(): AllergenCatalog {
  const {data} = useAllergensQuery();
  return useMemo(() => buildAllergenCatalog(data ?? BUILT_IN_ALLERGEN_OPTIONS), [data]);
}

export function useCreateAllergenMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAllergen,
    onSuccess: () => queryClient.invalidateQueries({queryKey: ALLERGENS_QUERY_KEY})
  });
}

export function useDeleteAllergenMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllergen,
    onSuccess: async () => {
      // Deleting also strips the allergen from products, so refresh both.
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ALLERGENS_QUERY_KEY}),
        queryClient.invalidateQueries({queryKey: PRODUCTS_QUERY_PREFIX})
      ]);
    }
  });
}
