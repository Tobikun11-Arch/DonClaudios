'use client';

import {AlarmClock, CalendarClock, PhoneCall, Wallet} from 'lucide-react';
import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';
import {useOrderingRulesQuery} from '@/lib/hooks/useOrderSchedule';
import {IN_STORE_PAYMENT_RULE} from '@/lib/payment/inStorePayment';
import {
  formatDuration,
  formatPeso,
  formatStoreDateTime,
  receiveWord,
  timeLeftLabel,
  type OrderingRules,
  type OrderTiming
} from '@/lib/orders/orderSchedule';

type Notice = {icon: typeof AlarmClock; title: string; body: ReactNode; tone?: 'warn'};

function NoticeList({notices, className}: {notices: Notice[]; className?: string}) {
  return (
    <ul className={cn('space-y-2', className)} aria-label="Order notices">
      {notices.map(n => {
        const Icon = n.icon;
        return (
          <li
            key={n.title}
            className={cn(
              'flex gap-3 rounded-xl border p-3 text-xs leading-relaxed',
              n.tone === 'warn'
                ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300'
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{n.title}</p>
              <div>{n.body}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** How the payment deadline of a dated order is set, in words. */
function datedPaymentRule(r: OrderingRules) {
  return `you have up to ${formatDuration(r.paymentWindowHours * 60)} to pay the down payment or full amount (at least ${formatDuration(
    r.paymentMinWindowHours * 60
  )}, and before your time slot)`;
}

function leadTimeNotice(r: OrderingRules): Notice {
  return {
    icon: CalendarClock,
    title: 'No last-minute orders',
    body: (
      <>
        Scheduled orders need at least {formatDuration(r.standardLeadMinutes)} notice. Large orders (
        {formatPeso(r.bulkMinSubtotal)} and up) need {formatDuration(r.bulkLeadHours * 60)}, and lechon needs
        its own minimum notice. Orders placed in the evening or at night are ready the next afternoon at the
        earliest.
      </>
    )
  };
}

const CONFIRM_NOTICE: Notice = {
  icon: PhoneCall,
  title: 'We will call to confirm',
  body: 'Our cashier will call you to confirm your order. It is not final until it is confirmed.'
};

/**
 * Notices on the checkout (customer and guest): when it will be ready, the
 * lead time, the confirmation call and the payment deadline / auto-cancel.
 */
export function CheckoutOrderNotices({
  orderType,
  timing,
  readyAt,
  advanceOnly,
  className
}: {
  orderType: string;
  timing: OrderTiming;
  readyAt?: string | null;
  advanceOnly?: boolean;
  className?: string;
}) {
  const {rules} = useOrderingRulesQuery();
  const word = receiveWord(orderType);
  const notices: Notice[] = [];

  notices.push({
    icon: AlarmClock,
    title: 'When it will be ready',
    body:
      timing === 'scheduled' && readyAt ? (
        <>
          Ready for {word} on <span className="font-semibold">{formatStoreDateTime(readyAt)}</span>.
        </>
      ) : timing === 'scheduled' ? (
        'Pick a date and time above.'
      ) : (
        'We start preparing once your order is confirmed (and paid, if you pay first). Your order page shows the estimated time.'
      )
  });
  notices.push(leadTimeNotice(rules));
  notices.push(CONFIRM_NOTICE);
  notices.push({
    icon: Wallet,
    title: 'Payment deadline',
    tone: 'warn',
    body:
      timing === 'scheduled' ? (
        <>
          After confirmation, {datedPaymentRule(rules)}. The exact deadline appears on your order page and we
          remind you before it.{' '}
          <span className="font-semibold">Unpaid orders are cancelled automatically when the deadline passes.</span>
          {advanceOnly ? ' This order needs a down payment or full payment first, online or at the store.' : ''} Any
          remaining balance must be paid before your {word} time.
        </>
      ) : (
        <>
          After confirmation, pay on your order page. An online payment link stays open for a limited time and
          in-store payment is due within {IN_STORE_PAYMENT_RULE.regularHours} hours.{' '}
          <span className="font-semibold">If the payment is not made in time, the order is cancelled automatically.</span>
        </>
      )
  });

  return <NoticeList notices={notices} className={className} />;
}

type OrderLike = {
  orderType?: string | null;
  orderStatus?: string | null;
  paymentStatus?: string | null;
  paymentChoice?: string | null;
  schedule?: {timing?: string; tier?: string} | null;
  scheduledAt?: string | null;
  isPreOrder?: boolean | null;
  preOrder?: {pickupAt?: string | null} | null;
  paymentDueAt?: string | null;
};

/**
 * Notices on an order page (tracking / pre-order): when it is ready, the
 * confirmation, and the live payment deadline with the auto-cancel policy.
 * Hidden once the order is finished.
 */
export function OrderStatusNotices({order, className}: {order: OrderLike; className?: string}) {
  const {rules} = useOrderingRulesQuery();
  const status = order.orderStatus ?? 'pending';
  if (status === 'cancelled' || status === 'completed') return null;

  const word = receiveWord(order.orderType);
  const pickupAt = order.preOrder?.pickupAt ?? order.scheduledAt ?? null;
  const dated = Boolean(pickupAt);
  const paid = order.paymentStatus === 'paid';
  const notices: Notice[] = [];

  notices.push({
    icon: AlarmClock,
    title: 'When it will be ready',
    body: dated ? (
      <>
        Ready for {word} on <span className="font-semibold">{formatStoreDateTime(pickupAt)}</span>.
      </>
    ) : (
      'As soon as possible after confirmation. See the estimated time on this page.'
    )
  });

  if (status === 'pending') {
    notices.push(CONFIRM_NOTICE);
    if (dated) {
      notices.push({
        icon: Wallet,
        title: 'Payment deadline',
        tone: 'warn',
        body: (
          <>
            Once confirmed, {datedPaymentRule(rules)}. We remind you before the deadline.{' '}
            <span className="font-semibold">Unpaid orders are cancelled automatically.</span>
          </>
        )
      });
    }
  } else if (!paid && dated) {
    const due = order.paymentDueAt;
    const left = timeLeftLabel(due);
    if (order.paymentStatus === 'down_payment') {
      notices.push({
        icon: Wallet,
        title: 'Balance due',
        tone: 'warn',
        body: (
          <>
            Please pay the remaining balance (online or at the store) before your {word} time,{' '}
            <span className="font-semibold">{formatStoreDateTime(pickupAt)}</span>. The order is released only once
            it is fully paid.
          </>
        )
      });
    } else if (due && order.paymentChoice !== 'cash_on_pickup') {
      notices.push({
        icon: Wallet,
        title: 'Pay before the deadline',
        tone: 'warn',
        body: (
          <>
            Pay the down payment or full amount by{' '}
            <span className="font-semibold">{formatStoreDateTime(due)}</span>
            {left ? ` (${left})` : ''}.{' '}
            <span className="font-semibold">
              If it is not paid by then, the order is cancelled automatically.
            </span>{' '}
            We will send you a reminder before the deadline.
          </>
        )
      });
    }
  }

  return <NoticeList notices={notices} className={className} />;
}
