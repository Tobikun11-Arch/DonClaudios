'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  getFreeDeliverySettings,
  updateFreeDeliverySettings
} from '@/lib/api/settingsApi';
import {
  DEFAULT_FREE_DELIVERY_SETTINGS,
  type FreeDeliverySettings
} from '@/lib/orders/deliveryMode';

export const freeDeliveryQueryKey = ['settings', 'free-delivery'] as const;

/**
 * Free-delivery minimum and Tanza zone. Falls back to the built-in defaults
 * while loading (or if the request fails) so checkout always has a zone.
 * The server re-checks everything when the order is placed.
 */
export function useFreeDeliveryQuery() {
  const query = useQuery({
    queryKey: freeDeliveryQueryKey,
    queryFn: getFreeDeliverySettings,
    staleTime: 5 * 60 * 1000
  });
  const settings: FreeDeliverySettings =
    query.data?.freeDelivery ?? DEFAULT_FREE_DELIVERY_SETTINGS;
  const defaults: FreeDeliverySettings =
    query.data?.defaults ?? DEFAULT_FREE_DELIVERY_SETTINGS;
  return {...query, settings, defaults};
}

export function useUpdateFreeDeliveryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FreeDeliverySettings) => updateFreeDeliverySettings(body),
    onSuccess: data => {
      queryClient.setQueryData(freeDeliveryQueryKey, data);
    }
  });
}
