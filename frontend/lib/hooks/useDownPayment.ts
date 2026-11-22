'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {getDownPaymentSettings, updateDownPaymentSettings} from '@/lib/api/settingsApi';
import {
  DEFAULT_DOWN_PAYMENT_PERCENT,
  DEFAULT_DOWN_PAYMENT_RULES,
  DOWN_PAYMENT_MIN_ORDER_MAX,
  DOWN_PAYMENT_PERCENT_MAX,
  DOWN_PAYMENT_PERCENT_MIN,
  downPaymentFlowOf,
  type DownPaymentRules
} from '@/lib/payment/downPaymentRules';

export {DEFAULT_DOWN_PAYMENT_PERCENT, DOWN_PAYMENT_PERCENT_MAX, DOWN_PAYMENT_PERCENT_MIN};

export const downPaymentQueryKey = ['settings', 'down-payment'] as const;

/**
 * The owner's down payment rules (public read). Falls back to the defaults
 * while loading. `percent` is the pre-order percent. What an order actually
 * owes is always computed on the server.
 */
export function useDownPaymentQuery() {
  const query = useQuery({
    queryKey: downPaymentQueryKey,
    queryFn: getDownPaymentSettings,
    staleTime: 5 * 60 * 1000
  });
  const rules: DownPaymentRules = query.data?.rules ?? DEFAULT_DOWN_PAYMENT_RULES;
  const percent = rules.preorder.percent;
  const limits = query.data?.limits ?? {
    default: DEFAULT_DOWN_PAYMENT_PERCENT,
    min: DOWN_PAYMENT_PERCENT_MIN,
    max: DOWN_PAYMENT_PERCENT_MAX,
    minOrderMax: DOWN_PAYMENT_MIN_ORDER_MAX
  };
  /** Live percent of the flow an order belongs to. */
  const percentForOrder = (order: {isPreOrder?: boolean | null; orderType?: string | null}) =>
    rules[downPaymentFlowOf(order)].percent;
  return {...query, rules, percent, limits, percentForOrder};
}

export function useUpdateDownPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rules: DownPaymentRules) => updateDownPaymentSettings({rules}),
    onSuccess: data => {
      queryClient.setQueryData(downPaymentQueryKey, data);
    }
  });
}

/**
 * The percent an order uses, same rule as the backend: nothing paid yet ->
 * the owner's live setting; already paid -> the percent saved on the order.
 */
export function effectiveDownPaymentPercent(
  order: {downPaymentPercent?: number | null; paymentStatus?: string | null},
  livePercent: number
) {
  if ((order.paymentStatus ?? 'unpaid') === 'unpaid' || order.downPaymentPercent == null) {
    return livePercent;
  }
  return order.downPaymentPercent;
}

/** Down payment for a total, rounded up — same as the backend. */
export function downPaymentFor(total: number, percent: number) {
  return Math.ceil((total * percent) / 100);
}
