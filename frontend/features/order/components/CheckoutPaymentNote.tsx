'use client';

import {downPaymentFor, useDownPaymentQuery} from '@/lib/hooks/useDownPayment';
import {ruleApplies, type DownPaymentFlow} from '@/lib/payment/downPaymentRules';

const peso = (n: number) => `₱${n.toLocaleString('en-PH', {maximumFractionDigits: 0})}`;

/** Checkout order type label ('Delivery' | 'Pick-up' | 'Reservation') -> rule flow. */
function flowOf(orderType: string): Exclude<DownPaymentFlow, 'preorder'> {
  if (orderType === 'Delivery') return 'delivery';
  if (orderType === 'Reservation') return 'reservation';
  return 'pickup';
}

const LATER: Record<Exclude<DownPaymentFlow, 'preorder'>, string> = {
  pickup: 'at pick-up',
  delivery: 'before the rider leaves',
  reservation: 'before your order is completed'
};

/**
 * "Payment after confirmation" text on the customer and guest checkout pages,
 * with the owner's down payment rule for the chosen order type
 * (Settings > Payments). The order page enforces it once confirmed.
 */
export function CheckoutPaymentNote({orderType, total}: {orderType: string; total: number}) {
  const {rules} = useDownPaymentQuery();
  const flow = flowOf(orderType);
  const rule = rules[flow];
  const applies = ruleApplies(rule, total);
  const dp = downPaymentFor(total, rule.percent);

  return (
    <>
      <p className="mt-5 text-sm text-gray-600 leading-relaxed dark:text-gray-300">
        Once our cashier confirms your order, you can pay on your order page: online (GCash, Maya,
        card and more){flow === 'pickup' ? ', in cash at the store, or in cash on pick-up' : ' or in cash at the store'}.
      </p>
      {rule.mode !== 'off' ? (
        <p className="mt-3 rounded-xl bg-[#2d4a35]/5 px-3 py-2 text-sm text-gray-700 leading-relaxed dark:bg-[#7ed4a0]/10 dark:text-gray-200">
          {applies ? (
            <>
              {rule.mode === 'required' ? 'This order needs a ' : 'You can pay a '}
              <span className="font-semibold">{rule.percent}% down payment</span> ({peso(dp)}) first
              and the remaining {peso(total - dp)} {LATER[flow]}.
            </>
          ) : (
            <>
              A {rule.percent}% down payment is available on {orderType.toLowerCase()} orders of{' '}
              {peso(rule.minOrder)} and up.
            </>
          )}
        </p>
      ) : null}
    </>
  );
}
