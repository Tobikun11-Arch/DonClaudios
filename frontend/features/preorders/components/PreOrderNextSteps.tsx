'use client';

import {CalendarCheck, CreditCard, PhoneCall, ShoppingBag} from 'lucide-react';
import {cn} from '@/lib/utils';
import {downPaymentFor} from '@/lib/hooks/useDownPayment';
import {useOrderingRulesQuery} from '@/lib/hooks/useOrderSchedule';
import {formatDuration} from '@/lib/orders/orderSchedule';
import {peso} from '../utils';

/** If the cut-off already passed when the order is placed, we call within this many days. */
const LATE_CALL_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Last day before an exclusive deadline instant, e.g. "December 10". */
function lastDayBefore(iso: string | Date) {
  return new Date(new Date(iso).getTime() - 1).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric'
  });
}

function weeksOrDays(days: number) {
  if (days > 0 && days % 7 === 0) {
    const w = days / 7;
    return `${w} week${w === 1 ? '' : 's'}`;
  }
  return `${days} day${days === 1 ? '' : 's'}`;
}

/**
 * The pre-order timeline in plain words, with real dates, so a customer who
 * books in November for December 24 knows when to expect the store's call and
 * when payment is due, instead of waiting with no date.
 *
 * The confirmation call and payment both fall on or before the free-cancel
 * cut-off (`cancelDeadline`, default 2 weeks before pickup). A pre-order placed
 * after the cut-off gets a call within LATE_CALL_DAYS days.
 */
export function PreOrderNextSteps({
  cancelDeadline,
  cutoffDays,
  pickupLabel,
  downPaymentPercent,
  total,
  placedAt,
  compact = false,
  className
}: {
  /** Exclusive instant: free cancellation ends here (pickup − cutoffDays). */
  cancelDeadline: string;
  cutoffDays: number;
  /** e.g. "Wednesday, December 24 · 8 - 9 AM" */
  pickupLabel: string;
  downPaymentPercent: number;
  /** Order total, to show the down payment in pesos. */
  total?: number;
  /** When the pre-order was placed (defaults to now, for the checkout preview). */
  placedAt?: string;
  compact?: boolean;
  className?: string;
}) {
  const {rules} = useOrderingRulesQuery();
  const payWindow = formatDuration(rules.paymentWindowHours * 60);
  const placed = placedAt ? new Date(placedAt) : new Date();
  const deadline = new Date(cancelDeadline);
  const beforeCutoff = deadline.getTime() > placed.getTime();
  const callBy = beforeCutoff
    ? lastDayBefore(deadline)
    : lastDayBefore(new Date(placed.getTime() + (LATE_CALL_DAYS + 1) * DAY_MS));
  const span = weeksOrDays(cutoffDays);
  const dp = typeof total === 'number' && total > 0 ? downPaymentFor(total, downPaymentPercent) : null;

  const steps = [
    {
      icon: ShoppingBag,
      title: 'Pre-order received',
      text: 'Your slot is held. No payment is needed yet.'
    },
    {
      icon: PhoneCall,
      title: `Expect our call on or before ${callBy}`,
      text: beforeCutoff
        ? `We confirm pre-orders up to ${span} before pickup, so it is normal not to hear from us right away. Keep your phone reachable.`
        : `Your pickup is less than ${span} away, so we will call you within ${LATE_CALL_DAYS} days.`
    },
    {
      icon: CreditCard,
      title: `Pay ${downPaymentPercent}% down${dp !== null ? ` (${peso(dp)})` : ''} or the full amount`,
      text: `Your pre-order is not final until our call. After it, you have up to ${payWindow} to pay online (GCash, Maya, card or bank) or at the store; the exact deadline shows on your order page and we remind you before it. Unpaid pre-orders are cancelled automatically. Any balance is due before your pickup time.`
    },
    {
      icon: CalendarCheck,
      title: 'Pickup day',
      text: pickupLabel
    }
  ];

  return (
    <div
      className={cn(
        'rounded-2xl border border-[#e3ece5] bg-[#f6faf7] p-4 dark:border-gray-700 dark:bg-gray-800/40',
        className
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-[#2d4a35] dark:text-[#7ed4a0]">
        What happens next
      </p>
      <ol className={cn('mt-3', compact ? 'space-y-2.5' : 'space-y-3')}>
        {steps.map((step, i) => {
          const Icon = step.icon;
          const last = i === steps.length - 1;
          return (
            <li key={step.title} className="relative flex gap-3">
              {!last && (
                <span
                  aria-hidden
                  className="absolute left-[13px] top-7 h-[calc(100%-12px)] w-px bg-[#cfe0d4] dark:bg-gray-700"
                />
              )}
              <span
                className={cn(
                  'relative grid h-7 w-7 shrink-0 place-items-center rounded-full',
                  i === 0
                    ? 'bg-[#2d4a35] text-white'
                    : 'bg-white text-[#2d4a35] ring-1 ring-[#cfe0d4] dark:bg-gray-900 dark:text-[#7ed4a0] dark:ring-gray-700'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 pb-0.5">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{step.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{step.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 border-t border-[#e3ece5] pt-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Haven&apos;t heard from us by {callBy}? Message us from your order page and we will follow up.
      </p>
    </div>
  );
}
