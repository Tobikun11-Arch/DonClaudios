'use client';

import Image from 'next/image';
import {useMemo, useState} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import {ChevronDown, ChevronLeft, ChevronRight, Loader2, Search, Globe, Store} from 'lucide-react';
import {cn} from '@/lib/utils';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  formatNumber,
  formatPeso
} from '@/features/owner/dashboard/components/reports/reportPrimitives';
import {OrderStatusPill, OrderTypePill, ALL_STATUSES} from './OrderPills';
import {ALL_TYPES, ORDER_TYPE_FILTERS} from '../hooks/useOwnerOrders';

const TYPE_LABELS: Record<(typeof ORDER_TYPE_FILTERS)[number], string> = {
  delivery: 'Delivery',
  pickup: 'Pick-up',
  reservation: 'Reservation'
};
import {OrderDetailDrawer} from './OrderDetailDrawer';
import {DownloadOrdersReport} from './DownloadOrdersReport';
import {ReportRangePicker} from '../../dashboard/components/reports/ReportRangePicker';
import {orderCustomerName, useOwnerOrders, OWNER_ORDERS_PAGE_SIZE} from '../hooks/useOwnerOrders';
import {useCounterOrdersQuery} from '@/lib/hooks/orders/useCashierCounterOrder';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';
import type {ReportRange} from '@/lib/types/report';
import {PreOrderBadge} from '@/shared/components/PreOrderBadge';

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/** Compact page-number window: 1 … 4 5 6 … 20. */
function pageWindow(current: number, total: number): Array<number | '⋯'> {
  if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
  const pages: Array<number | '⋯'> = [];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  pages.push(1);
  if (start > 2) pages.push('⋯');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('⋯');
  pages.push(total);
  return pages;
}

/** Lazy-loading skeleton of the desktop table so the layout doesn't jump. */
function OrdersTableSkeleton({rows = 6}: {rows?: number}) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-[#E5E7EB] dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:block">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#E5E7EB] dark:border-gray-700 bg-[#F7FAF6] dark:bg-gray-800/60">
            {['Order', 'Customer', 'Type', 'Status', 'Items', 'Total', ''].map(header => (
              <th
                key={header}
                className={cn(
                  'px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-gray-400',
                  header === 'Total' || header === '' ? 'text-right' : 'text-left'
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({length: rows}).map((_, i) => (
            <tr key={i} className="border-b border-[#E5E7EB] dark:border-gray-700 last:border-0">
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-5 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </td>
              <td className="px-4 py-3.5 text-right">
                <div className="ml-auto h-3.5 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </td>
              <td className="px-4 py-3.5 text-right">
                <div className="ml-auto h-3.5 w-8 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersCardsSkeleton({rows = 4}: {rows?: number}) {
  return (
    <div className="space-y-2.5 lg:hidden">
      {Array.from({length: rows}).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[#E5E7EB] dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-44 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="mt-3 flex gap-1.5">
            <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="h-5 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function OrdersPagination({
  page,
  totalPages,
  total,
  onPageChange,
  isFetching
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  isFetching: boolean;
}) {
  const from = (page - 1) * OWNER_ORDERS_PAGE_SIZE + 1;
  const to = Math.min(page * OWNER_ORDERS_PAGE_SIZE, total);
  const navClass = (active: boolean) =>
    cn(
      'flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition-colors',
      active
        ? 'border-[#2d4a35] dark:border-[#7ed4a0]/60 bg-[#2d4a35] text-white'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[0.75rem] text-[#6B7280] dark:text-gray-400">
        {isFetching ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2d4a35] dark:text-[#7ed4a0]" />
            Loading page {page}…
          </span>
        ) : (
          <>
            Showing{' '}
            <span className="font-semibold text-[#1A1A1A] dark:text-gray-100">
              {formatNumber(from)}–{formatNumber(to)}
            </span>{' '}
            of <span className="font-semibold text-[#1A1A1A] dark:text-gray-100">{formatNumber(total)}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn(navClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageWindow(page, totalPages).map((entry, idx) =>
          entry === '⋯' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">
              ⋯
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              aria-current={entry === page ? 'page' : undefined}
              className={navClass(entry === page)}
            >
              {entry}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(navClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function OwnerOrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [range, setRange] = useState<ReportRange>({preset: 'today'});
  const [selected, setSelected] = useState<OrderHistoryEntry | null>(null);
  const orderSourceTab: 'online' | 'walk-in' =
    searchParams.get('source') === 'walk-in' ? 'walk-in' : 'online';

  const {
    filters,
    orders,
    page,
    totalPages,
    total,
    statusCounts,
    typeCounts,
    isSearching,
    setPage,
    isPending,
    isFetching,
    isError,
    error,
    updateStatus,
    isUpdatingStatus
  } = useOwnerOrders(range);

  const {
    data: counterData,
    isLoading: counterLoading,
    isFetching: counterFetching,
    isError: counterError,
    error: counterErrorObj
  } = useCounterOrdersQuery({preset: range.preset, from: range.from, to: range.to});
  const counterOrders = useMemo(
    () => (counterData?.orders ?? []) as OrderHistoryEntry[],
    [counterData?.orders]
  );

  const walkInStatusCounts = useMemo(
    () => ({
      paid: counterOrders.filter(o => o.paymentStatus === 'paid').length,
      unpaid: counterOrders.filter(o => o.paymentStatus !== 'paid').length,
      all: counterOrders.length
    }),
    [counterOrders]
  );

  // Walk-in (counter) orders are filtered client-side by status/search since
  // /orders/counter already applies the selected date range server-side.
  const walkInFiltered = useMemo(() => {
    let base = counterOrders;
    if (filters.status === 'paid') {
      base = base.filter(o => o.paymentStatus === 'paid');
    } else if (filters.status === 'unpaid') {
      base = base.filter(o => o.paymentStatus !== 'paid');
    }
    // text search
    const needle = filters.search.trim().toLowerCase();
    if (needle) {
      base = base.filter(order => {
        const customer = order.customerName ?? [
          order.guestInfo?.firstName,
          order.guestInfo?.lastName
        ]
          .filter(Boolean)
          .join(' ');
        const haystack = [
          order._id,
          customer,
          order.guestInfo?.phoneNumber,
          order.paymentMethod,
          ...(order.items ?? []).map(item =>
            typeof item.productId === 'string' ? '' : (item.productId?.name ?? '')
          )
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      });
    }
    return base;
  }, [counterOrders, filters.status, filters.search]);

  const isWalkIn = orderSourceTab === 'walk-in';

  // Filter orders by source
  const filteredBySource = useMemo(() => {
    if (isWalkIn) return walkInFiltered;
    return orders.filter(o => o.orderSource !== 'in-store');
  }, [isWalkIn, walkInFiltered, orders]);

  const visible = filteredBySource;

  const displayIsError = isWalkIn ? counterError : isError;
  const displayError = isWalkIn ? counterErrorObj : error;
  const displayIsPending = isWalkIn ? counterLoading : isPending;
  const displayIsFetching = isWalkIn ? counterFetching : isFetching;
  const displayTotalPages = isWalkIn ? 1 : totalPages;
  const displayTotal = isWalkIn ? walkInFiltered.length : total;

  // While a request is in flight we render skeleton rows, never the empty state,
  // so there's no "No orders match these filters" flash before data lands.
  const showSkeleton = visible.length === 0 && (displayIsPending || displayIsFetching);
  const count = isSearching ? visible.length : filteredBySource.length;
  const shownRevenue = isSearching
    ? visible
        .filter(o => o.orderStatus !== 'cancelled')
        .reduce((sum, o) => sum + o.totalAmount, 0)
    : filteredBySource
        .filter(o => o.orderStatus !== 'cancelled')
        .reduce((sum, o) => sum + o.totalAmount, 0);

  // The facet ignores the status filter but not the date range, so this is the
  // queue size for whatever range is selected.
  const allCount = useMemo(
    () => Object.values(statusCounts).reduce((sum, n) => sum + n, 0),
    [statusCounts]
  );

  // Count for each tab
  const onlineCount = useMemo(() => orders.length, [orders]);
  const walkInCount = useMemo(() => counterOrders.length, [counterOrders]);

  const handleTabChange = (tab: 'online' | 'walk-in') => {
    // Each tab has its own filter (type for online, paid/unpaid for walk-in),
    // so start clean: a leftover "paid" must never reach the online query.
    filters.setStatus(ALL_STATUSES);
    filters.setType(ALL_TYPES);
    // Update URL without full page reload using Next.js router
    const params = new URLSearchParams(searchParams.toString());
    params.set('source', tab);
    router.replace(`/owner/dashboard?${params.toString()}`, {scroll: false});
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[1.5rem] font-bold text-[#1A1A1A] dark:text-gray-100">Orders</h1>
          <p className="text-[0.875rem] text-[#6B7280] dark:text-gray-400">
            {showSkeleton
              ? 'Loading orders…'
              : `${formatNumber(count)} order${count === 1 ? '' : 's'} · ${formatPeso(shownRevenue, shownRevenue % 1 !== 0)} revenue`}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <DownloadOrdersReport />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={filters.search}
              onChange={e => filters.setSearch(e.target.value)}
              placeholder="Search order, customer, item…"
              aria-label="Search orders"
              className="w-full rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-9 pr-3 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:border-[#2d4a35] dark:focus:border-[#7ed4a0]/60 focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
            />
          </div>

          <div className="relative shrink-0">
            {isWalkIn ? (
              <select
                id="order-status-filter"
                value={filters.status}
                onChange={e => filters.setStatus(e.target.value)}
                aria-label="Filter by payment"
                className="appearance-none rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-4 pr-9 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 focus:border-[#2d4a35] dark:focus:border-[#7ed4a0]/60 focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
              >
                <option value={ALL_STATUSES}>
                  All payments ({formatNumber(walkInStatusCounts.all)})
                </option>
                <option value="paid">Paid ({formatNumber(walkInStatusCounts.paid)})</option>
                <option value="unpaid">Unpaid ({formatNumber(walkInStatusCounts.unpaid)})</option>
              </select>
            ) : (
              // Online orders: filter by order type, like the cashier queue.
              <select
                id="order-type-filter"
                value={filters.type}
                onChange={e => filters.setType(e.target.value)}
                aria-label="Filter by order type"
                className="appearance-none rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-4 pr-9 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 focus:border-[#2d4a35] dark:focus:border-[#7ed4a0]/60 focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
              >
                <option value={ALL_TYPES}>All types ({formatNumber(allCount)})</option>
                {ORDER_TYPE_FILTERS.map(type => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]} ({formatNumber(typeCounts[type] ?? 0)})
                  </option>
                ))}
              </select>
            )}
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          <ReportRangePicker value={range} onChange={setRange} />
        </div>

        <div
          role="tablist"
          aria-label="Order source"
          className="flex shrink-0 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={orderSourceTab === 'online'}
            aria-controls="orders-list"
            onClick={() => handleTabChange('online')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              orderSourceTab === 'online'
                ? 'bg-[#2d4a35] text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
            )}
          >
            <Globe size={14} />
            Online Orders
            <span className="ml-0.5 opacity-70">({formatNumber(onlineCount)})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={orderSourceTab === 'walk-in'}
            aria-controls="orders-list"
            onClick={() => handleTabChange('walk-in')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              orderSourceTab === 'walk-in'
                ? 'bg-[#2d4a35] text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
            )}
          >
            <Store size={14} />
            Walk-in Orders
            <span className="ml-0.5 opacity-70">({formatNumber(walkInCount)})</span>
          </button>
        </div>
      </div>

      {displayIsError ? (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-5 py-8 text-center text-sm text-red-600 dark:text-red-400">
            {getFriendlyErrorMessage(displayError, 'Failed to load orders')}
        </div>
      ) : showSkeleton ? (
        <>
          <OrdersTableSkeleton />
          <OrdersCardsSkeleton />
        </>
      ) : visible.length === 0 ? (
        <>
          {/* Desktop: keep the table header, show the character where the rows go */}
          <div className="hidden overflow-hidden rounded-xl border border-[#E5E7EB] dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-gray-700 bg-[#F7FAF6] dark:bg-gray-800/60">
                  {['Order', 'Customer', 'Type', 'Status', 'Items', 'Total', ''].map(header => (
                    <th
                      key={header}
                      className={cn(
                        'px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-gray-400',
                        header === 'Total' || header === '' ? 'text-right' : 'text-left'
                      )}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="px-5 py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Image
                        src="/assets/table/table_1.png"
                        alt=""
                        width={208}
                        height={208}
                        className="h-44 w-44 object-contain sm:h-52 sm:w-52"
                      />
                      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        {orderSourceTab === 'walk-in'
                          ? 'No walk-in orders yet.'
                          : 'No online orders match these filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Mobile: centered character */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-12 lg:hidden">
            <Image
              src="/assets/table/table_1.png"
              alt=""
              width={176}
              height={176}
              className="h-44 w-44 object-contain"
            />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {orderSourceTab === 'walk-in'
                ? 'No walk-in orders yet.'
                : 'No online orders match these filters.'}
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Desktop table */}
          <div
            id="orders-list"
            className={cn(
              'hidden overflow-hidden rounded-xl border border-[#E5E7EB] dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-opacity lg:block',
              isFetching && 'opacity-60'
            )}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-gray-700 bg-[#F7FAF6] dark:bg-gray-800/60">
                  {['Order', 'Customer', 'Type', 'Status', 'Items', 'Total', ''].map(header => (
                    <th
                      key={header}
                      className={cn(
                        'px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-gray-400',
                        header === 'Total' || header === '' ? 'text-right' : 'text-left'
                      )}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(order => {
                  const items = order.items ?? [];
                  const units = items.reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <tr
                      key={order._id}
                      onClick={() => setSelected(order)}
                      className="cursor-pointer border-b border-[#E5E7EB] dark:border-gray-700 transition-colors last:border-0 hover:bg-[#E8F0E3] dark:hover:bg-[#7ed4a0]/10"
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-[0.8rem] font-bold text-[#1A1A1A] dark:text-gray-100">
                          {order.orderSource === 'in-store' && order.orderNumber
                            ? order.orderNumber
                            : `#${order._id.slice(-8).toUpperCase()}`}
                        </p>
                        <p className="text-[0.72rem] text-[#6B7280] dark:text-gray-400">{formatDateTime(order.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[0.85rem] font-medium text-[#1A1A1A] dark:text-gray-100">
                          {orderCustomerName(order)}
                        </p>
                        {order.guestInfo?.phoneNumber &&
                          order.guestInfo.phoneNumber !== 'n/a' && (
                            <p className="text-[0.72rem] text-[#6B7280] dark:text-gray-400">
                              {order.guestInfo.phoneNumber}
                            </p>
                          )}
                      </td>
                      <td className="px-4 py-3">
                        {order.orderSource !== 'in-store' && <OrderTypePill type={order.orderType} />}
                      <PreOrderBadge order={order} />
                      </td>
                      <td className="px-4 py-3">
                        {order.orderSource !== 'in-store' && (
                          <OrderStatusPill status={order.orderStatus} />
                        )}
                        {order.orderSource === 'in-store' && order.paymentStatus && (
                          <span
                            className={
                              'ml-1 rounded-md px-1.5 py-0.5 text-[0.68rem] font-semibold ' +
                              (order.paymentStatus === 'paid'
                                ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300'
                                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300')
                            }
                          >
                            {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[0.82rem] text-[#1A1A1A] dark:text-gray-100">
                        {formatNumber(units)} item{units === 1 ? '' : 's'}
                      </td>
                      <td className="px-4 py-3 text-right text-[0.875rem] font-semibold tabular-nums text-[#1A1A1A] dark:text-gray-100">
                        {formatPeso(order.totalAmount, order.totalAmount % 1 !== 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-[0.8rem] font-semibold text-[#2d4a35] dark:text-[#7ed4a0]">
                        View
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul
            id="orders-list"
            className={cn(
              'space-y-2.5 transition-opacity lg:hidden',
              isFetching && 'opacity-60'
            )}
          >
            {visible.map(order => {
              const units = (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
              return (
                <li key={order._id}>
                  <button
                    type="button"
                    onClick={() => setSelected(order)}
                    className="w-full rounded-xl border border-[#E5E7EB] dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors active:bg-[#E8F0E3] dark:active:bg-[#7ed4a0]/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[0.78rem] font-bold text-[#1A1A1A] dark:text-gray-100">
                          {order.orderSource === 'in-store' && order.orderNumber
                            ? order.orderNumber
                            : `#${order._id.slice(-8).toUpperCase()}`}
                        </p>
                        <p className="truncate text-[0.85rem] text-[#1A1A1A] dark:text-gray-100">
                          {orderCustomerName(order)}
                        </p>
                        <p className="text-[0.72rem] text-[#6B7280] dark:text-gray-400">
                          {formatDateTime(order.createdAt)} · {formatNumber(units)} item
                          {units === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className="shrink-0 text-[0.9rem] font-bold tabular-nums text-[#1A1A1A] dark:text-gray-100">
                        {formatPeso(order.totalAmount, order.totalAmount % 1 !== 0)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {order.orderSource !== 'in-store' && <OrderStatusPill status={order.orderStatus} />}
                      {order.orderSource !== 'in-store' && <OrderTypePill type={order.orderType} />}
                      <PreOrderBadge order={order} />
                      {order.orderSource === 'in-store' && order.paymentStatus && (
                        <span
                          className={
                            'rounded-md px-1.5 py-0.5 text-[0.68rem] font-semibold ' +
                            (order.paymentStatus === 'paid'
                              ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300'
                              : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300')
                          }
                        >
                          {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {!isSearching && !isWalkIn && totalPages > 1 && (
            <OrdersPagination
              page={page}
              totalPages={displayTotalPages}
              total={displayTotal}
              onPageChange={setPage}
              isFetching={displayIsFetching && !showSkeleton}
            />
          )}
          {isWalkIn && walkInFiltered.length > OWNER_ORDERS_PAGE_SIZE && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing {walkInFiltered.length} walk-in orders
            </p>
          )}
        </>
      )}

      <OrderDetailDrawer
        order={selected}
        onClose={() => setSelected(null)}
        onUpdateStatus={(orderId, status) => updateStatus({orderId, status})}
        isUpdating={isUpdatingStatus}
      />
    </div>
  );
}