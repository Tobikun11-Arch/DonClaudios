'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {getDownPaymentSettings, updateDownPaymentSettings} from '@/lib/api/settingsApi';

/** Mirrors backend config/paymentFees.ts. The backend enforces the range. */
export const DEFAULT_DOWN_PAYMENT_PERCENT = 50;
export const DOWN_PAYMENT_PERCENT_MIN = 10;
export const DOWN_PAYMENT_PERCENT_MAX = 90;

export const downPaymentQueryKey = ['settings', 'down-payment'] as const;

/**
 * The owner's pre-order down payment percent (public read). Falls back to the
 * default while loading. What an order actually owes is always computed on the
 * server from the percent saved on that order.
 */
export function useDownPaymentQuery() {
  const query = useQuery({
    queryKey: downPaymentQueryKey,
    queryFn: getDownPaymentSettings,
    staleTime: 5 * 60 * 1000
  });
  const percent = query.data?.downPaymentPercent ?? DEFAULT_DOWN_PAYMENT_PERCENT;
  const limits = query.data?.limits ?? {
    default: DEFAULT_DOWN_PAYMENT_PERCENT,
    min: DOWN_PAYMENT_PERCENT_MIN,
    max: DOWN_PAYMENT_PERCENT_MAX
  };
  return {...query, percent, limits};
}

export function useUpdateDownPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (downPaymentPercent: number) => updateDownPaymentSettings({downPaymentPercent}),
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
