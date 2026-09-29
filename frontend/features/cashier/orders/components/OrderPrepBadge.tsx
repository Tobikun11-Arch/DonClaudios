'use client';

import {AlertTriangle, Clock} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
  formatMinutes,
  OVERDUE_GRACE_MINUTES,
  useOrderPrepCountdown
} from '@/lib/hooks/useOrderPrepCountdown';
import type {OrderPrepTiming} from '@/lib/api/orderApi';

export function OrderPrepBadge({
  timing,
  orderType,
  className
}: {
  timing?: OrderPrepTiming;
  orderType?: string;
  className?: string;
}) {
  const {estimate, remaining, isRunning, isOverdue, hasEstimate} =
    useOrderPrepCountdown(timing);

  if (!hasEstimate || orderType === 'reservation') return null;

  if (!isRunning || remaining === null) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600',
          className
        )}
      >
        <Clock size={11} />
        Est. {formatMinutes(estimate as number)}
      </span>
    );
  }

  if (isOverdue) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700',
          className
        )}
      >
        <AlertTriangle size={11} />
        OVERDUE by {formatMinutes(Math.abs(remaining))}
        <span className="font-semibold text-red-500">
          (expected {formatMinutes((estimate as number) + OVERDUE_GRACE_MINUTES)})
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
        remaining <= OVERDUE_GRACE_MINUTES
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700',
        className
      )}
    >
      <Clock size={11} />
      {formatMinutes(remaining)} left
    </span>
  );
}

/** Compact "Est. 30 min" label for list rows and detail panels. */
export function OrderEstimateLabel({
  timing,
  orderType,
  className
}: {
  timing?: OrderPrepTiming;
  orderType?: string;
  className?: string;
}) {
  const {estimate, isRunning, hasEstimate} = useOrderPrepCountdown(timing);
  if (!hasEstimate || orderType === 'reservation') return null;

  return (
    <span className={cn('text-[11px] text-gray-400', className)}>
      Est. {formatMinutes(estimate as number)}
      {isRunning ? ' · started' : ''}
    </span>
  );
}
