'use client';

import {useState, useEffect} from 'react';
import {useBrand} from '@/lib/hooks/useBrand';
import Image from 'next/image';
import {
  Clock,
  X,
  XCircle,
  AlertTriangle,
  Bike,
  CalendarDays,
  Store
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import FrameLoader from '@/shared/components/FrameLoader';
import {
  useCancelTrackedOrderMutation,
  useTrackOrderQuery
} from '@/lib/hooks/orders/useTrackOrder';

import {
  type OrderHistoryEntry,
  type OrderHistoryItem
} from '@/lib/api/orderApi';
import {toast} from 'sonner';
import CustomerOrderFollowUp from '@/features/order/components/CustomerOrderFollowUp';
import {courierLabel, customerStep, fulfillmentKind, fulfillmentLabel, statusFlow} from '@/lib/orders/orderFlow';
import OrderPaymentCard from '@/features/order/components/OrderPaymentCard';
import {
  formatMinutes,
  OVERDUE_GRACE_MINUTES,
  useOrderPrepCountdown
} from '@/lib/hooks/useOrderPrepCountdown';

const STORE_NAME = "DonClaudio's Lechon House";
const STORE_ADDRESS =
  'Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza, Cavite, Philippines 4108';

const CANCELLABLE = ['pending'];

/** Pre-orders: cancellable in any open status until the date's cut-off. */
function canCustomerCancel(order: OrderHistoryEntry) {
  if (order.isPreOrder && order.preOrder) {
    if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed') return false;
    return Date.now() < new Date(order.preOrder.cancelDeadline).getTime();
  }
  return CANCELLABLE.includes(order.orderStatus);
}

function manilaDate(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('en-PH', {timeZone: 'Asia/Manila', ...opts});
}

function PreOrderPickupCard({order}: {order: OrderHistoryEntry}) {
  const po = order.preOrder;
  if (!po) return null;
  const lalamove = po.receiveMethod === 'lalamove';
  const open = order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed';
  const canCancel = canCustomerCancel(order);
  return (
    <div className="overflow-hidden rounded-2xl border border-[#d7e3da] bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-4 bg-[#3c5e45] px-5 py-4 text-white">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white/10">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[#fbd897]">
            {manilaDate(po.pickupAt, {month: 'short'})}
          </span>
          <span className="text-2xl font-bold leading-none">
            {manilaDate(po.pickupAt, {day: 'numeric'})}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-[#fbd897]">Holiday Pre-order</p>
          <p className="truncate font-bold">{po.eventTitle}</p>
          <p className="text-sm text-white/80">
            {manilaDate(po.pickupAt, {weekday: 'long', month: 'long', day: 'numeric'})} · {po.slotLabel}
          </p>
        </div>
      </div>
      <div className="space-y-2 px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
        <p className="flex items-start gap-2">
          {lalamove ? (
            <Bike className="mt-0.5 h-4 w-4 shrink-0 text-[#2d4a35] dark:text-[#7ed4a0]" />
          ) : (
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-[#2d4a35] dark:text-[#7ed4a0]" />
          )}
          {lalamove
            ? 'Lalamove: please book your own rider to collect at the store within your time slot.'
            : 'Self pick-up at the store within your time slot.'}
        </p>
        {open ? (
          <p className="flex items-start gap-2 text-gray-500 dark:text-gray-400">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#2d4a35] dark:text-[#7ed4a0]" />
            {canCancel
              ? `You can cancel until ${manilaDate(new Date(new Date(po.cancelDeadline).getTime() - 1).toISOString(), {month: 'long', day: 'numeric'})}.`
              : 'The cancellation period for this pre-order has ended.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

const CANCEL_REASONS = [
  'Ordered by mistake',
  'Taking too long',
  'Need to change my order',
  'Others'
];

type Step = {status: string; label: string; detail: string};

/** Steps for this kind of order (see lib/orders/orderFlow.ts). */
function getSteps(order: OrderHistoryEntry): Step[] {
  return statusFlow(order)
    .filter(st => st !== 'pending')
    .map(st => {
      const {title, detail} = customerStep(order, st);
      return {status: st, label: title, detail};
    });
}

function getItemName(item: OrderHistoryItem) {
  if (item.name) return item.name;
  if (item.productId && typeof item.productId === 'object') {
    return item.productId.name ?? 'Product';
  }
  return 'Product';
}

function getItemImage(item: OrderHistoryItem) {
  if (item.imageUrl) return item.imageUrl;
  if (item.productId && typeof item.productId === 'object') {
    return item.productId.imageUrl;
  }
  return undefined;
}

function fmtMoney(value: number) {
  return `₱${(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function orderTypeDisplay(orderType: string) {
  if (orderType === 'pickup') return 'Pick-up';
  if (orderType === 'delivery') return 'Delivery';
  return 'Reservation';
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  gcash: 'GCash',
  maya: 'Maya',
  grabpay: 'GrabPay',
  shopeepay: 'ShopeePay',
  bdo: 'BDO Transfer',
  bpi: 'BPI Transfer',
  psbank: 'PSBank Transfer'
};

function paymentDisplay(order: OrderHistoryEntry) {
  if (order.paymentStatus === 'down_payment') {
    const channel = order.paymentChannel
      ? METHOD_LABELS[order.paymentChannel] ?? order.paymentChannel
      : 'Online';
    return `${channel} (down payment)${order.balanceChoice === 'cash' ? ' + cash balance' : ''}`;
  }
  if (order.paymentChoice === 'cash_on_pickup' && order.paymentStatus !== 'paid') {
    return 'Cash on pickup';
  }
  const method = order.paymentMethod;
  if (!method || method === 'other') {
    return order.orderStatus === 'pending'
      ? 'Choose after the store confirms your order'
      : 'Not paid yet';
  }
  let label = METHOD_LABELS[method] ?? method;
  if (order.changeFor) {
    label += ` (Change for ₱${order.changeFor})`;
  }
  return label;
}

/** Pre-orders say how they are received instead of the generic order type. */
function typeDisplay(order: OrderHistoryEntry) {
  if (order.isPreOrder && order.preOrder) {
    return order.preOrder.receiveMethod === 'lalamove'
      ? 'Pre-order · Lalamove (you book)'
      : 'Pre-order · Self pick-up';
  }
  if (order.orderType === 'delivery') return fulfillmentLabel(order);
  return orderTypeDisplay(order.orderType);
}

function deliveryAddress(order: OrderHistoryEntry) {
  // Lalamove pre-orders are collected at the store by the customer's rider.
  if (order.isPreOrder) return STORE_ADDRESS;
  if (order.orderType === 'delivery') {
    return order.guestInfo?.address?.length
      ? order.guestInfo.address
      : order.customerName
        ? `${order.customerName}'s saved address`
        : STORE_ADDRESS;
  }
  return STORE_ADDRESS;
}

export default function OrderTracking({
  orderId,
  variant,
  embedded = false,
  showTrackingNumber = true
}: {
  orderId: string;
  variant: 'guest' | 'customer';
  embedded?: boolean;
  /** Guests: show the copyable tracking number so they can track later. */
  showTrackingNumber?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const storedEmail = '';

  const resolvedPhone = undefined;

  const resolvedEmail = variant === 'guest' ? storedEmail : undefined;
  const query = useTrackOrderQuery(orderId, resolvedPhone, resolvedEmail);
  const order = query.data?.order;

  if (variant === 'guest' && !mounted) {
    return (
      <div className="py-10 grid place-items-center">
        <FrameLoader
          framesDir="/assets/order-loading"
          frames={[
            'frame_01.png',
            'frame_02.png',
            'frame_03.png',
            'frame_04.png',
            'frame_05.png'
          ]}
          size={160}
        />
      </div>
    );
  }


  return (
    <div className={embedded ? '' : 'min-h-screen'}>
      <div
        className={
          embedded
            ? 'w-full max-w-3xl mx-auto space-y-4'
            : 'w-full max-w-3xl mx-auto px-4 py-10 space-y-6'
        }
      >
        {query.isLoading && !order ? (
          <div className="py-10 grid place-items-center">
            <FrameLoader
              framesDir="/assets/order-loading"
              frames={[
                'frame_01.png',
                'frame_02.png',
                'frame_03.png',
                'frame_04.png',
                'frame_05.png'
              ]}
              size={160}
            />
          </div>
        ) : query.isError || !order ? (
          <div className="rounded-2xl bg-white shadow p-10 text-center dark:bg-gray-900">
            <AlertTriangle className="h-10 w-10 mx-auto text-gray-400" />
            <p className="mt-4 text-base font-bold text-gray-900 dark:text-gray-100">
              Order not found
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {variant === 'customer'
                ? 'We could not load this order. Make sure you are signed in with the account that placed it.'
                : 'We couldn\u2019t find this order. Please check the link or the phone number you entered.'}
            </p>
            {variant === 'customer' ? (
              <a
                href="/sign-in"
                className="mt-4 inline-block rounded-full bg-[#3c5e45] px-5 py-2 text-sm font-semibold text-white"
              >
                Sign in
              </a>
            ) : null}
          </div>
        ) : (
          <>
            {variant === 'guest' && !embedded && showTrackingNumber ? (
              <TrackingNumberBar orderId={order._id} />
            ) : null}
            {order.orderStatus === 'pending' ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <p className="font-semibold">Awaiting confirmation call</p>
                <p className="mt-1">
                  Our team will call{' '}
                  {order.guestInfo?.phoneNumber
                    ? order.guestInfo.phoneNumber
                    : 'you'}{' '}
                  to confirm this order before we start preparing it. Please keep
                  your line open.
                </p>
              </div>
            ) : null}
            {order.isPreOrder ? <PreOrderPickupCard order={order} /> : null}
            {order.orderStatus === 'cancelled' ? (
              <CancelledCard order={order} />
            ) : (
              <StatusTrackerCard order={order} />
            )}
            <OrderSummaryCard order={order} />
            {!embedded ? (
              <CustomerOrderFollowUp
                order={order}
                variant="card"
                defaultOpen
                asGuest={variant === 'guest'}
              />
            ) : null}
            <OrderPaymentCard order={order} phone={resolvedPhone} />
            <PaymentsDetailsCard order={order} />
            {canCustomerCancel(order) && (
              <CancelOrderButton
                orderId={orderId}
                phone={resolvedPhone}
                hint={
                  order.isPreOrder && order.preOrder
                    ? `Pre-orders can be cancelled up to ${order.preOrder.cancelDeadline ? Math.round((new Date(order.preOrder.pickupAt).getTime() - new Date(order.preOrder.cancelDeadline).getTime()) / 86400000) : 14} days before pickup.`
                    : undefined
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}


function CustomerEtaPanel({order}: {order: OrderHistoryEntry}) {
  const {estimate, remaining, isRunning, isOverdue, hasEstimate} =
    useOrderPrepCountdown(order.prepTiming);

  if (!hasEstimate || order.orderType === 'reservation') return null;

  if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed') {
    return (
      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          This order took about {formatMinutes(estimate as number)} to prepare.
        </p>
      </div>
    );
  }

  if (isOverdue) {
    return (
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
          Your order is taking longer than usual
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
          We expected it in about {formatMinutes((estimate as number) + OVERDUE_GRACE_MINUTES)}{' '}
          and the kitchen is still working on it. Sorry for the wait — you can
          follow the live status below, and our team is aware.
        </p>
      </div>
    );
  }

  if (isRunning && remaining !== null) {
    return (
      <div className="mt-5 rounded-xl border border-[#3c5e45]/20 bg-[#3c5e45]/5 px-4 py-3 dark:border-[#7ed4a0]/30 dark:bg-[#7ed4a0]/10">
        <p className="text-sm font-bold text-[#2d4a35] dark:text-[#7ed4a0]">
          Ready in about {formatMinutes(remaining)}
        </p>
        <p className="mt-1 text-sm text-[#2d4a35]/80 dark:text-[#7ed4a0]/80">
          Started preparing at{' '}
          {order.prepTiming?.preparingAt
            ? new Date(order.prepTiming.preparingAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'a moment ago'}
          . We&apos;ll let you know when it&apos;s on the way.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Estimated prep time: {formatMinutes(estimate as number)}
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        The countdown starts once the kitchen begins preparing your order.
      </p>
    </div>
  );
}

/** Guests have no account: give them the number to track this order later. */
function TrackingNumberBar({orderId}: {orderId: string}) {
  const copy = () => {
    navigator.clipboard
      ?.writeText(orderId)
      .then(() => toast.success('Tracking number copied.'))
      .catch(() => toast.error('Couldn’t copy. Select and copy it instead.'));
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#3c5e45]/20 bg-[#e9f5ee] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#3c5e45]">
          Tracking number · save it to check this order later
        </p>
        <p className="mt-0.5 break-all font-mono text-sm font-bold text-gray-900 select-all">{orderId}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={copy}
          className="rounded-full bg-[#3c5e45] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2d4a35]"
        >
          Copy
        </button>
        <a
          href={`/track?id=${orderId}`}
          className="rounded-full border border-[#3c5e45]/40 px-3 py-1.5 text-xs font-semibold text-[#2d4a35] hover:bg-white/60"
        >
          Tracking page
        </a>
      </div>
    </div>
  );
}

/** Self-booked delivery: where to send the rider, and when. */
function CourierPickupCallout({order}: {order: OrderHistoryEntry}) {
  const courier = courierLabel(order.courier);
  const ready = order.orderStatus === 'ready';
  return (
    <div
      className={
        ready
          ? 'mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
          : 'mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
      }
    >
      <p className="font-semibold">
        {ready
          ? `Your food is ready — book your ${courier} rider now.`
          : `You'll book your own ${courier} rider. We'll tell you here when the food is ready.`}
      </p>
      <p className="mt-1 text-xs">Pick-up address for the rider: {STORE_ADDRESS}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(STORE_ADDRESS);
            toast.success('Store address copied.');
          }}
          className="rounded-full bg-[#3c5e45] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2d4a35]"
        >
          Copy address
        </button>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE_ADDRESS)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-[#3c5e45]/40 px-3 py-1.5 text-xs font-semibold text-[#2d4a35] hover:bg-white/60 dark:border-[#7ed4a0]/40 dark:text-[#7ed4a0]"
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}

function StatusTrackerCard({order}: {order: OrderHistoryEntry}) {
  const brand = useBrand();
  const steps = getSteps(order);
  const kind = fulfillmentKind(order);
  let statusIndex = steps.findIndex(s => s.status === order.orderStatus);
  // An older courier delivery left "on the way" sits between ready and done.
  if (statusIndex < 0 && order.orderStatus === 'on_the_way') {
    statusIndex = Math.max(0, steps.length - 2);
  }
  const currentIndex = order.orderStatus === 'pending' ? -1 : statusIndex;

  return (
    <div className="rounded-2xl bg-white shadow p-6 sm:p-8 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-full bg-[#3c5e45]/10 overflow-hidden shrink-0 dark:bg-[#7ed4a0]/10">
          <Image
            src={brand.logo}
            alt="DonClaudio's"
            fill
            className="object-contain p-1.5"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Order status</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {STORE_NAME} • {typeDisplay(order)}
          </p>
        </div>
      </div>

      {order.orderStatus === 'pending' && (
        <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 dark:bg-amber-500/10 dark:border-amber-500/30">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Waiting for the store to confirm your order
          </p>
        </div>
      )}

      <CustomerEtaPanel order={order} />

      <div className="mt-6 flex flex-col">
        {steps.map((step, i) => {
          const isPast = currentIndex >= 0 && i < currentIndex;
          const isCurrent = i === currentIndex;
          const isLast = i === steps.length - 1;
          return (
            <div key={step.status} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={
                    isCurrent
                      ? 'mt-1 h-5 w-5 rounded-full bg-[#3c5e45] ring-4 ring-[#3c5e45]/20'
                      : isPast
                        ? 'mt-1.5 h-4 w-4 rounded-full bg-gray-400'
                        : 'mt-1.5 h-4 w-4 rounded-full border-2 border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900'
                  }
                />
                {!isLast && (
                  <div
                    className={
                      isPast || isCurrent
                        ? 'w-0.5 flex-1 min-h-8 bg-[#3c5e45]'
                        : 'w-0.5 flex-1 min-h-8 bg-gray-200 dark:bg-gray-700'
                    }
                  />
                )}
              </div>
              <div className="pb-8 last:pb-0">
                <p
                  className={
                    isCurrent
                      ? 'text-sm font-bold text-gray-900 dark:text-gray-100'
                      : isPast
                        ? 'text-sm text-gray-500 dark:text-gray-400'
                        : 'text-sm text-gray-400'
                  }
                >
                  {step.label}
                </p>
                {isCurrent && step.detail ? (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{step.detail}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {kind === 'courier_delivery' &&
      ['confirmed', 'preparing', 'ready'].includes(order.orderStatus) ? (
        <CourierPickupCallout order={order} />
      ) : null}

      <div className="mt-4 pt-5 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
        <Clock className="h-4 w-4 text-gray-400" />
        <span className="font-semibold text-gray-900 dark:text-gray-100">Estimated time </span>
        <span>
          Check back on this page for the latest update on your order.
        </span>
      </div>
    </div>
  );
}

function CancelledCard({order}: {order: OrderHistoryEntry}) {
  return (
    <div className="rounded-2xl bg-red-50 border border-red-200 shadow p-8 text-center dark:bg-red-500/10 dark:border-red-500/30">
      <div className="h-14 w-14 mx-auto rounded-full bg-red-100 flex items-center justify-center dark:bg-red-500/15">
        <XCircle className="h-7 w-7 text-red-600 dark:text-red-300" />
      </div>
      <p className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">
        This order was cancelled
      </p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        No further updates will be made to this order.
      </p>
      {order.cancelReason?.length ? (
        <p className="mt-4 inline-block rounded-full bg-white border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 dark:bg-gray-900 dark:border-red-500/30 dark:text-red-300">
          Reason: {order.cancelReason}
        </p>
      ) : null}
    </div>
  );
}

function OrderSummaryCard({order}: {order: OrderHistoryEntry}) {
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryFee = order.deliveryFee ?? 0;

  return (
    <div className="rounded-2xl bg-white shadow p-6 dark:bg-gray-900">
      <p className="text-base font-bold text-gray-900 dark:text-gray-100">Order Summary</p>

      <div className="mt-5 space-y-4">
        {order.items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No items on this order.</p>
        ) : (
          order.items.map((item, index) => {
            const itemImageUrl = getItemImage(item);
            return (
              <div
                key={item._id ?? `${order._id}-${index}`}
                className="flex items-start gap-3"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <Image
                    src={
                      itemImageUrl && itemImageUrl.length > 0
                        ? itemImageUrl
                        : '/assets/sample_menu.png'
                    }
                    alt={getItemName(item)}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 line-clamp-2 dark:text-gray-100">
                    {getItemName(item)}
                  </p>
                  {item.sizeLabel ? (
                    <p className="text-xs font-semibold text-[#2d4a35] mt-0.5 dark:text-[#7ed4a0]">
                      {item.sizeLabel}
                    </p>
                  ) : null}
                  <p className="text-xs text-gray-500 mt-0.5 dark:text-gray-400">
                    Qty {item.quantity} • {fmtMoney(item.price)} each
                  </p>
                  {item.specialRequest ? (
                    <p className="text-xs text-gray-500 mt-0.5 dark:text-gray-400">
                      Request: {item.specialRequest}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-sm font-extrabold text-gray-900 dark:text-gray-100">
                  {fmtMoney(item.price * item.quantity)}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
        <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
          <span>Subtotal</span>
          <span className="font-semibold">{fmtMoney(subtotal)}</span>
        </div>
        {/* The store does not deliver, so only show a fee when one was charged. */}
        {deliveryFee > 0 ? (
          <div className="mt-2 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
            <span>Delivery fee</span>
            <span className="font-semibold">{fmtMoney(deliveryFee)}</span>
          </div>
        ) : null}
        <div className="mt-2 h-px bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Total</span>
          <span className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
            {fmtMoney(order.totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PaymentsDetailsCard({order}: {order: OrderHistoryEntry}) {
  const rows: {label: string; value: string}[] = [
    {label: 'Payment method', value: paymentDisplay(order)},
    {label: 'Order Number', value: order._id},
    {label: 'Order type', value: typeDisplay(order)},
    {
      label:
        order.orderType === 'delivery' && !order.isPreOrder
          ? 'Delivery address'
          : order.isPreOrder
            ? 'Pickup location'
            : 'Branch location',
      value: deliveryAddress(order)
    }
  ];

  if (order.createdAt) {
    rows.push({
      label: 'Placed at',
      value: new Date(order.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    });
  }
  if (order.customerName) {
    rows.push({label: 'Customer', value: order.customerName});
  }

  return (
    <div className="rounded-2xl bg-white shadow p-6 dark:bg-gray-900">
      <p className="text-base font-bold text-gray-900 dark:text-gray-100">Payment & Order Details</p>

      <div className="mt-5 space-y-4">
        {rows.map(row => (
          <div key={row.label} className="flex items-start justify-between gap-6">
            <p className="text-xs text-gray-500 shrink-0 pt-0.5 dark:text-gray-400">
              {row.label}
            </p>
            <p className="text-right text-sm font-semibold text-gray-900 break-words min-w-0 dark:text-gray-100">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CancelOrderButton({
  orderId,
  phone,
  hint = 'You can only cancel while your order is still pending.'
}: {
  orderId: string;
  phone?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [otherText, setOtherText] = useState('');
  const cancelMutation = useCancelTrackedOrderMutation(orderId, phone);
  const isPending = cancelMutation.isPending;
  const error = cancelMutation.error as {
    message?: string;
  } | null;

  const finalReason =
    reason === 'Others'
      ? otherText.trim().length
        ? otherText.trim()
        : 'Others'
      : reason;

  return (
    <div className="pt-2 pb-8">
      <Button
        type="button"
        variant="destructive"
        className="w-full h-12 rounded-full font-bold text-white"
        onClick={() => setOpen(true)}
      >
        Cancel Order
      </Button>
      <p className="mt-2 text-center text-xs text-gray-400">
        {hint}
      </p>

      {open ? (
        <div className="fixed inset-0 z-100" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => {
              if (!isPending) setOpen(false);
            }}
          />
          <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white shadow-xl border border-gray-100 rounded-t-2xl sm:rounded-2xl p-6 dark:bg-gray-900 dark:border-gray-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Let us know why you&apos;re cancelling
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This will permanently cancel your order.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => {
                    if (!isPending) setOpen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {CANCEL_REASONS.map(option => (
                  <label
                    key={option}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 cursor-pointer has-[:checked]:border-[#3c5e45] has-[:checked]:bg-[#3c5e45]/5 dark:border-gray-700 dark:has-[:checked]:border-[#7ed4a0]/60 dark:has-[:checked]:bg-[#7ed4a0]/10"
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={option}
                      checked={reason === option}
                      onChange={() => setReason(option)}
                      className="accent-[#3c5e45] h-4 w-4"
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-100">{option}</span>
                  </label>
                ))}
              </div>

              {reason === 'Others' ? (
                <input
                  type="text"
                  value={otherText}
                  onChange={e => setOtherText(e.target.value)}
                  placeholder="Tell us more (optional)"
                  className="mt-3 w-full h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#3c5e45] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-[#7ed4a0]/60"
                />
              ) : null}

              {error?.message ? (
                <p className="mt-3 text-xs text-red-600 dark:text-red-300">{error.message}</p>
              ) : null}

              <div className="mt-6 space-y-2.5">
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full h-12 rounded-full font-bold text-white"
                  disabled={isPending}
                  onClick={() => cancelMutation.mutate(finalReason)}
                >
                  {isPending ? 'Cancelling...' : 'Cancel Order'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-full border-[#3c5e45] text-[#3c5e45] dark:text-[#7ed4a0] dark:border-[#7ed4a0]/60"
                  disabled={isPending}
                  onClick={() => setOpen(false)}
                >
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}