'use client';

import Link from 'next/link';
import {Truck} from 'lucide-react';
import type {FreeDeliveryStatus} from '@/lib/orders/useFreeDeliveryStatus';
import {cn} from '@/lib/utils';

const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`;

/**
 * One line explaining the free-delivery state: free, or what is missing
 * (an account, a pin, being inside Tanza, or a bigger order).
 */
export default function FreeDeliveryHint({
  status,
  className
}: {
  status: FreeDeliveryStatus;
  className?: string;
}) {
  const {reason, remaining, settings} = status;
  if (reason === 'disabled') return null;

  const min = peso(settings.minSubtotal);
  const message =
    reason === 'free'
      ? "Free delivery by DonClaudio's — you're inside our Tanza delivery area."
      : reason === 'guest'
        ? `Free delivery within Tanza is for customers with an account (lechon orders or ${min}+).`
        : reason === 'no_pin'
          ? `Pin your location on the map to check free delivery (Tanza area, lechon orders or ${min}+).`
          : reason === 'outside_zone'
            ? 'Your pin is outside our free-delivery area (Tanza only), so this order goes by Lalamove.'
            : `Add ${peso(remaining)} more (or a lechon) for free delivery inside Tanza.`;

  const good = reason === 'free';

  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-medium',
        good
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'bg-gray-50 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300',
        className
      )}
    >
      <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {message}
        {reason === 'guest' ? (
          <>
            {' '}
            <Link href="/sign-in" className="font-semibold text-[#3c5e45] underline dark:text-[#7ed4a0]">
              Log in
            </Link>
          </>
        ) : null}
      </span>
    </p>
  );
}
