'use client';

import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {getOrderingRules, updateOrderingRules} from '@/lib/api/settingsApi';
import {quoteOrderSchedule} from '@/lib/api/orderApi';
import {DEFAULT_ORDERING_RULES, type OrderingRules} from '@/lib/orders/orderSchedule';

export const orderingRulesQueryKey = ['settings', 'ordering-rules'] as const;

/** Live Ordering Rules (public read), defaults while loading. */
export function useOrderingRulesQuery() {
  const query = useQuery({
    queryKey: orderingRulesQueryKey,
    queryFn: getOrderingRules,
    staleTime: 5 * 60 * 1000
  });
  const rules: OrderingRules = query.data?.rules ?? DEFAULT_ORDERING_RULES;
  return {...query, rules};
}

export function useUpdateOrderingRulesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rules: OrderingRules) => updateOrderingRules(rules),
    onSuccess: data => {
      queryClient.setQueryData(orderingRulesQueryKey, data);
      queryClient.invalidateQueries({queryKey: ['order-schedule-quote']});
    }
  });
}

/**
 * Slots this cart may take. Re-asked when the cart or order type changes and
 * every minute (slots close as time passes).
 */
export function useScheduleQuote(
  orderType: 'pickup' | 'delivery' | 'reservation',
  items: {productId: string; quantity: number}[]
) {
  const key = items
    .map(i => `${i.productId}:${i.quantity}`)
    .sort()
    .join('|');
  return useQuery({
    queryKey: ['order-schedule-quote', orderType, key],
    queryFn: () => quoteOrderSchedule({orderType, items}),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000
  });
}
