'use client';

import {useMemo, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Bike,
  ChevronDown,
  ReceiptText,
  ShoppingBag,
  UtensilsCrossed
} from 'lucide-react';
import OrderTracking from './OrderTracking';
import type {OrderHistoryEntry, OrderHistoryItem} from '@/lib/api/orderApi';
import {PreOrderBadge} from '@/shared/components/PreOrderBadge';
import SectionLoader from '@/shared/components/SectionLoader';

const FALLBACK_IMAGE = '/assets/sample_menu.png';

type Tone = {label: string; pill: string; dot: string; bar: string};

const STATUS_TONES: Record<string, Tone> = {
  pending: {
    label: 'Pending',
    pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
    dot: 'bg-amber-500',
    bar: 'bg-amber-400'
  },
  confirmed: {
    label: 'Confirmed',
    pill: 'bg-[#4a7c59]/10 text-[#2d4a35] ring-[#4a7c59]/25 dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0] dark:ring-[#7ed4a0]/25',
    dot: 'bg-[#4a7c59] dark:bg-[#7ed4a0]',
    bar: 'bg-[#4a7c59]'
  },
  preparing: {
    label: 'Preparing',
    pill: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30',
    dot: 'bg-orange-500',
    bar: 'bg-orange-400'
  },
  ready: {
    label: 'Ready',
    pill: 'bg-[#7ed4a0]/20 text-[#2d4a35] ring-[#7ed4a0]/50 dark:bg-[#7ed4a0]/15 dark:text-[#7ed4a0] dark:ring-[#7ed4a0]/40',
    dot: 'bg-[#7ed4a0]',
    bar: 'bg-[#7ed4a0]'
  },
  on_the_way: {
    label: 'On the way',
    pill: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
    dot: 'bg-sky-500',
    bar: 'bg-sky-400'
  },
  completed: {
    label: 'Completed',
    pill: 'bg-[#2d4a35] text-white ring-[#2d4a35] dark:bg-[#7ed4a0]/15 dark:text-[#7ed4a0] dark:ring-[#7ed4a0]/30',
    dot: 'bg-white dark:bg-[#7ed4a0]',
    bar: 'bg-[#2d4a35] dark:bg-[#7ed4a0]'
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
    dot: 'bg-red-500',
    bar: 'bg-red-300 dark:bg-red-500/60'
  }
};

function statusTone(status: string): Tone {
  return (
    STATUS_TONES[status] ?? {
      label: status
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      pill: 'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700',
      dot: 'bg-gray-400',
      bar: 'bg-gray-300'
    }
  );
}

function peso(amount: number) {
  return `₱${(amount ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatOrderType(orderType: string) {
  return orderType.charAt(0).toUpperCase() + orderType.slice(1);
}

function OrderTypeIcon({orderType, size = 13}: {orderType: string; size?: number}) {
  if (orderType === 'delivery') return <Bike size={size} aria-hidden />;
  if (orderType === 'reservation') return <UtensilsCrossed size={size} aria-hidden />;
  return <ShoppingBag size={size} aria-hidden />;
}

function formatPaymentMethod(paymentMethod?: string | null) {
  switch (paymentMethod) {
    case 'cash':
      return 'Cash';
    case 'card':
      return 'Card';
    case 'gcash':
      return 'GCash';
    case 'maya':
      return 'Maya';
    case 'bdo':
      return 'BDO Transfer';
    case 'bpi':
      return 'BPI Transfer';
    case 'psbank':
      return 'PSBank Transfer';
    case 'other':
      return 'Arranged with cashier';
    default:
      return 'Cash';
  }
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

function shortId(id: string) {
  return id.slice(-6).toUpperCase();
}

function formatTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-PH', {hour: 'numeric', minute: '2-digit'});
}

function formatDateTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function dayKey(iso?: string) {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso?: string) {
  if (!iso) return 'Earlier';
  const d = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDay.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-PH', {weekday: 'short', month: 'short', day: 'numeric'});
}

const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'preparing', 'ready', 'on_the_way']);

export type HistoryRange = 'today' | '7days' | 'month';

const RANGE_OPTIONS: {value: HistoryRange; label: string; empty: string}[] = [
  {value: 'today', label: 'Today', empty: 'No orders today yet.'},
  {value: '7days', label: '7 Days', empty: 'No orders in the last 7 days.'},
  {value: 'month', label: 'Last Month', empty: 'No orders in the last month.'}
];

type OrderHistorySectionProps = {
  orders: OrderHistoryEntry[];
  title: string;
  description: string;
  isLoading?: boolean;
  isError?: boolean;
  activeRange?: HistoryRange;
  onRangeChange?: (range: HistoryRange) => void;
  renderFollowUp?: (order: OrderHistoryEntry, openChat: boolean) => React.ReactNode;
  /** Buttons shown under a card, e.g. "Order again". Return null for none. */
  renderActions?: (order: OrderHistoryEntry) => React.ReactNode;
  /** Shown in the empty state, e.g. a link back to the menu. */
  emptyAction?: {href: string; label: string};
  highlightOrderId?: string | null;
  openChatOrderId?: string | null;
  variant?: 'guest' | 'customer';
};

export default function OrderHistorySection({
  orders,
  title,
  description,
  isLoading = false,
  isError = false,
  activeRange,
  onRangeChange,
  renderFollowUp,
  renderActions,
  emptyAction,
  openChatOrderId = null,
  variant = 'customer'
}: OrderHistorySectionProps) {
  // Scrolling to and flashing `?highlight=` is done by useScrollToHighlight
  // on the page, which also waits for the list to load.

  const groups = useMemo(() => {
    const out: {key: string; label: string; orders: OrderHistoryEntry[]}[] = [];
    for (const order of orders) {
      const key = dayKey(order.createdAt);
      const last = out[out.length - 1];
      if (last && last.key === key) last.orders.push(order);
      else out.push({key, label: dayLabel(order.createdAt), orders: [order]});
    }
    return out;
  }, [orders]);

  const stats = useMemo(() => {
    const placed = orders.filter(o => o.orderStatus !== 'cancelled');
    return {
      count: orders.length,
      spent: placed.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0),
      active: orders.filter(o => ACTIVE_STATUSES.has(o.orderStatus)).length
    };
  }, [orders]);

  const emptyText =
    RANGE_OPTIONS.find(o => o.value === activeRange)?.empty ?? 'No orders yet.';

  return (
    <section className="mx-auto mb-10 w-full max-w-4xl px-4">
      <header className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a7c59] dark:text-[#7ed4a0]/80">
          Your orders
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#2d4a35] sm:text-3xl dark:text-[#7ed4a0]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </header>

      {onRangeChange ? (
        <div
          role="tablist"
          aria-label="Order date range"
          className="mb-5 inline-flex w-full rounded-full bg-[#2d4a35]/[0.06] p-1 sm:w-auto dark:bg-white/5"
        >
          {RANGE_OPTIONS.map(option => {
            const active = activeRange === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onRangeChange(option.value)}
                className={`flex-1 rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all sm:flex-none sm:px-5 ${
                  active
                    ? 'bg-[#2d4a35] text-white shadow-sm dark:bg-[#7ed4a0] dark:text-[#1b2e21]'
                    : 'text-[#2d4a35]/70 hover:text-[#2d4a35] dark:text-gray-400 dark:hover:text-[#7ed4a0]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {!isLoading && !isError && orders.length > 0 && variant === 'customer' ? (
        <dl className="mb-6 grid grid-cols-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#2d4a35] to-[#4a7c59] text-white shadow-sm dark:from-[#1f3326] dark:to-[#2d4a35]">
          <Stat label="Orders" value={String(stats.count)} />
          <Stat label="Spent" value={peso(stats.spent).replace(/\.00$/, '')} />
          <Stat label="In progress" value={String(stats.active)} />
        </dl>
      ) : null}

      {isLoading ? (
        <SectionLoader
          label="Loading order history"
          className="min-h-[240px] rounded-2xl border border-[#2d4a35]/10 bg-white dark:border-white/10 dark:bg-gray-900"
        />
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          We couldn&apos;t load your order history. Please refresh to try again.
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#2d4a35]/20 bg-white px-6 py-12 text-center dark:border-white/10 dark:bg-gray-900">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7ed4a0]/20 text-[#2d4a35] dark:text-[#7ed4a0]">
            <ReceiptText size={26} aria-hidden />
          </span>
          <p className="mt-4 text-base font-bold text-gray-900 dark:text-gray-100">{emptyText}</p>
          <p className="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">
            {activeRange && activeRange !== 'month'
              ? 'Try a wider date range, or start a new order.'
              : 'Your orders will show up here once you place one.'}
          </p>
          {emptyAction ? (
            <Link
              href={emptyAction.href}
              className="mt-5 rounded-full bg-[#2d4a35] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#4a7c59] dark:bg-[#7ed4a0] dark:text-[#1b2e21] dark:hover:bg-[#9be3b6]"
            >
              {emptyAction.label}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.key}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {group.label}
                </h2>
                <span className="h-px flex-1 bg-[#2d4a35]/10 dark:bg-white/10" />
                <span className="text-[11px] font-semibold text-gray-400">
                  {group.orders.length} order{group.orders.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-3">
                {group.orders.map(order => (
                  <OrderCard
                    key={order._id}
                    order={order}
                    variant={variant}
                    renderFollowUp={renderFollowUp}
                    renderActions={renderActions}
                    openChat={order._id === openChatOrderId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div className="border-r border-white/10 px-3 py-3 last:border-r-0 sm:px-5 sm:py-4">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/70 sm:text-[11px]">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-base font-extrabold sm:text-xl">{value}</dd>
    </div>
  );
}

function Thumbs({items}: {items: OrderHistoryItem[]}) {
  const shown = items.slice(0, 2);
  const extra = items.length - shown.length;
  if (shown.length === 0) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#7ed4a0]/15 text-[#4a7c59]">
        <ReceiptText size={22} aria-hidden />
      </div>
    );
  }
  if (shown.length === 1) {
    const src = getItemImage(shown[0]);
    return (
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#7ed4a0]/10 ring-1 ring-[#2d4a35]/10 dark:ring-white/10">
        <Image
          src={src && src.length > 0 ? src : FALLBACK_IMAGE}
          alt={getItemName(shown[0])}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div className="relative h-16 w-16 shrink-0">
      {shown.map((item, i) => {
        const src = getItemImage(item);
        return (
          <div
            key={item._id ?? i}
            className={`absolute h-12 w-12 overflow-hidden rounded-xl bg-[#7ed4a0]/10 ring-2 ring-white dark:ring-gray-900 ${
              i === 0 ? 'left-0 top-0' : 'bottom-0 right-0'
            }`}
          >
            <Image
              src={src && src.length > 0 ? src : FALLBACK_IMAGE}
              alt={getItemName(item)}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
        );
      })}
      {extra > 0 ? (
        <span className="absolute -bottom-1 -right-1 rounded-full bg-[#2d4a35] px-1.5 py-0.5 text-[10px] font-bold text-white ring-2 ring-white dark:bg-[#7ed4a0] dark:text-[#1b2e21] dark:ring-gray-900">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

function StatusPill({status}: {status: string}) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${tone.pill}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${tone.dot} ${
          ACTIVE_STATUSES.has(status) ? 'animate-pulse' : ''
        }`}
        aria-hidden
      />
      {tone.label}
    </span>
  );
}

function OrderCard({
  order,
  variant,
  renderFollowUp,
  renderActions,
  openChat
}: {
  order: OrderHistoryEntry;
  variant: 'guest' | 'customer';
  renderFollowUp?: (order: OrderHistoryEntry, openChat: boolean) => React.ReactNode;
  renderActions?: (order: OrderHistoryEntry) => React.ReactNode;
  openChat: boolean;
}) {
  // A notification deep link with `openChat=1` opens the card so the chat shows.
  const [expanded, setExpanded] = useState(openChat);
  const [prevOpenChat, setPrevOpenChat] = useState(openChat);
  if (openChat !== prevOpenChat) {
    setPrevOpenChat(openChat);
    if (openChat) setExpanded(true);
  }

  const firstItem = order.items[0];
  const itemCount = order.items.length;
  const name = firstItem ? getItemName(firstItem) : 'Order';
  const tone = statusTone(order.orderStatus);
  const actions = renderActions?.(order);
  const isCancelled = order.orderStatus === 'cancelled';
  // Completed orders show a receipt; everything else (cancelled included,
  // for its refund state) shows live tracking.
  const isFinished = order.orderStatus === 'completed';
  const detailsId = `order-details-${order._id}`;

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee =
    order.deliveryFee ?? (order.orderType === 'delivery' && itemCount > 0 ? 49 : 0);

  return (
    <article
      id={`order-${order._id}`}
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900 ${
        expanded
          ? 'border-[#4a7c59]/30 dark:border-[#7ed4a0]/25'
          : 'border-[#2d4a35]/10 dark:border-white/10'
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} aria-hidden />

      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="flex w-full items-start gap-3 p-4 pl-5 text-left transition-colors hover:bg-[#7ed4a0]/[0.06] sm:gap-4 sm:p-5 sm:pl-6"
      >
        <Thumbs items={order.items} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p
              className={`min-w-0 text-[15px] font-bold leading-snug text-gray-900 line-clamp-1 dark:text-gray-100 ${
                isCancelled ? 'text-gray-500 dark:text-gray-400' : ''
              }`}
            >
              {name}
              {itemCount > 1 ? (
                <span className="font-semibold text-gray-400"> +{itemCount - 1} more</span>
              ) : null}
            </p>
            <p
              className={`shrink-0 text-[15px] font-extrabold tabular-nums ${
                isCancelled
                  ? 'text-gray-400 line-through decoration-1'
                  : 'text-[#2d4a35] dark:text-[#7ed4a0]'
              }`}
            >
              {peso(order.totalAmount)}
            </p>
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1 font-semibold text-gray-600 dark:text-gray-300">
              <OrderTypeIcon orderType={order.orderType} />
              {formatOrderType(order.orderType)}
            </span>
            <span aria-hidden>·</span>
            <span>
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </span>
            <span aria-hidden>·</span>
            <span className="font-mono text-[11px]">#{shortId(order._id)}</span>
          </p>

          <PreOrderBadge order={order} className="mt-2" />

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <StatusPill status={order.orderStatus} />
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <time dateTime={order.createdAt}>{formatTime(order.createdAt)}</time>
              <ChevronDown
                size={18}
                className={`text-gray-400 transition-transform duration-200 ${
                  expanded ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </span>
          </div>
        </div>
      </button>

      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-dashed border-[#2d4a35]/10 px-4 py-2.5 pl-5 sm:px-5 sm:pl-6 dark:border-white/10">
          {actions}
        </div>
      ) : null}

      {expanded ? (
        <div
          id={detailsId}
          className="border-t border-[#2d4a35]/10 bg-[#f6faf7] p-4 pl-5 sm:p-5 sm:pl-6 dark:border-white/10 dark:bg-gray-950/40"
        >
          {!isFinished ? (
            <>
              <OrderTracking orderId={order._id} variant={variant} embedded />
              {renderFollowUp ? (
                <div className="mt-4">{renderFollowUp(order, openChat)}</div>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Order #{shortId(order._id)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Placed {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <StatusPill status={order.orderStatus} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <InfoTile label="Order type" value={formatOrderType(order.orderType)} />
                <InfoTile label="Payment" value={formatPaymentMethod(order.paymentMethod)} />
                <InfoTile label="Payment status" value="Paid" className="col-span-2 sm:col-span-1" />
              </dl>

              <ul className="mt-4 divide-y divide-[#2d4a35]/10 rounded-xl bg-white ring-1 ring-[#2d4a35]/10 dark:divide-white/10 dark:bg-gray-900 dark:ring-white/10">
                {order.items.map((item, index) => {
                  const src = getItemImage(item);
                  return (
                    <li key={item._id ?? `${order._id}-${index}`} className="flex items-start gap-3 p-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#7ed4a0]/10">
                        <Image
                          src={src && src.length > 0 ? src : FALLBACK_IMAGE}
                          alt={getItemName(item)}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 line-clamp-2 dark:text-gray-100">
                          {getItemName(item)}
                          {item.sizeLabel ? (
                            <span className="font-semibold text-gray-500"> ({item.sizeLabel})</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {item.quantity} × {peso(item.price)}
                        </p>
                        {item.specialRequest ? (
                          <p className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">
                            “{item.specialRequest}”
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                        {peso(item.price * item.quantity)}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-[#2d4a35]/10 dark:bg-gray-900 dark:ring-white/10">
                <Row label="Subtotal" value={peso(subtotal)} />
                {/* Only show a delivery fee when one was charged. */}
                {deliveryFee > 0 ? <Row label="Delivery fee" value={peso(deliveryFee)} /> : null}
                <div className="my-2 border-t border-dashed border-gray-200 dark:border-gray-700" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-lg font-extrabold tabular-nums text-[#2d4a35] dark:text-[#7ed4a0]">
                    {peso(order.totalAmount)}
                  </span>
                </div>
              </div>

              {order.riderNotes ? (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Notes:</span> {order.riderNotes}
                </p>
              ) : null}

              {renderFollowUp ? <div className="mt-4">{renderFollowUp(order, openChat)}</div> : null}
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

function InfoTile({label, value, className = ''}: {label: string; value: string; className?: string}) {
  return (
    <div
      className={`rounded-xl bg-white p-3 ring-1 ring-[#2d4a35]/10 dark:bg-gray-900 dark:ring-white/10 ${className}`}
    >
      <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return (
    <div className="mt-1 flex items-center justify-between text-sm text-gray-600 first:mt-0 dark:text-gray-300">
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
