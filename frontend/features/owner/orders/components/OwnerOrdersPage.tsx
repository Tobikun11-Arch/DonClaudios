'use client';

import {useState} from 'react';
import {ChevronDown, ChevronLeft, ChevronRight, Loader2, Search} from 'lucide-react';
import {cn} from '@/lib/utils';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  formatNumber,
  formatPeso
} from '@/features/owner/dashboard/components/reports/reportPrimitives';
import {OrderStatusPill, OrderTypePill, ORDER_STATUSES, formatStatus} from './OrderPills';
import {OrderDetailDrawer} from './OrderDetailDrawer';
import {DownloadOrdersReport} from './DownloadOrdersReport';
import {orderCustomerName, useOwnerOrders, OWNER_ORDERS_PAGE_SIZE} from '../hooks/useOwnerOrders';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';
import type {ReportRange} from '@/lib/types/report';

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
    <div className="hidden overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:block">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#E5E7EB] bg-[#F7FAF6]">
            {['Order', 'Customer', 'Type', 'Status', 'Items', 'Total', ''].map(header => (
              <th
                key={header}
                className={cn(
                  'px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]',
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
            <tr key={i} className="border-b border-[#E5E7EB] last:border-0">
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-gray-100" />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-5 w-16 animate-pulse rounded-md bg-gray-100" />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100" />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-12 animate-pulse rounded bg-gray-100" />
              </td>
              <td className="px-4 py-3.5 text-right">
                <div className="ml-auto h-3.5 w-16 animate-pulse rounded bg-gray-100" />
              </td>
              <td className="px-4 py-3.5 text-right">
                <div className="ml-auto h-3.5 w-8 animate-pulse rounded bg-gray-100" />
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
          className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-44 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="mt-3 flex gap-1.5">
            <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100" />
            <div className="h-5 w-16 animate-pulse rounded-md bg-gray-100" />
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
        ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[0.75rem] text-[#6B7280]">
        {isFetching ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2d4a35]" />
            Loading page {page}…
          </span>
        ) : (
          <>
            Showing{' '}
            <span className="font-semibold text-[#1A1A1A]">
              {formatNumber(from)}–{formatNumber(to)}
            </span>{' '}
            of <span className="font-semibold text-[#1A1A1A]">{formatNumber(total)}</span>
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
  const [range] = useState<ReportRange>({preset: '7d'});
  const [selected, setSelected] = useState<OrderHistoryEntry | null>(null);

  const {
    filters,
    orders,
    page,
    totalPages,
    total,
    revenue,
    statusCounts,
    isSearching,
    setPage,
    isPending,
    isFetching,
    isError,
    error,
    updateStatus,
    isUpdatingStatus
  } = useOwnerOrders(range);

  const visible = orders;

  // While a request is in flight we render skeleton rows, never the empty state,
  // so there's no "No orders match these filters" flash before data lands.
  const showSkeleton = visible.length === 0 && (isPending || isFetching);
  const count = isSearching ? visible.length : total;
  const shownRevenue = isSearching
    ? visible
        .filter(o => o.orderStatus !== 'cancelled')
        .reduce((sum, o) => sum + o.totalAmount, 0)
    : revenue;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[1.5rem] font-bold text-[#1A1A1A]">Orders</h1>
          <p className="text-[0.875rem] text-[#6B7280]">
            {showSkeleton
              ? 'Loading orders…'
              : `${formatNumber(count)} order${count === 1 ? '' : 's'} · ${formatPeso(shownRevenue, shownRevenue % 1 !== 0)} revenue`}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <DownloadOrdersReport />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={filters.search}
            onChange={e => filters.setSearch(e.target.value)}
            placeholder="Search order, customer, item…"
            aria-label="Search orders"
            className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
          />
        </div>

        <div className="relative shrink-0">
          <select
            id="order-status-filter"
            value={filters.status}
            onChange={e => filters.setStatus(e.target.value)}
            aria-label="Filter by status"
            className="appearance-none rounded-full border border-gray-200 bg-white py-2 pl-4 pr-9 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
          >
            {ORDER_STATUSES.map(status => (
              <option key={status} value={status}>
                {formatStatus(status)} ({statusCounts[status] ?? 0})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

      </div>

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-600">
          {getFriendlyErrorMessage(error, 'Failed to load orders')}
        </div>
      ) : showSkeleton ? (
        <>
          <OrdersTableSkeleton />
          <OrdersCardsSkeleton />
        </>
      ) : visible.length === 0 ? (
        <>
          {/* Desktop: keep the table header, show the character where the rows go */}
          <div className="hidden overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7FAF6]">
                  {['Order', 'Customer', 'Type', 'Status', 'Items', 'Total', ''].map(header => (
                    <th
                      key={header}
                      className={cn(
                        'px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]',
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
                    <div className="flex items-center justify-center">
                      <img
                        src="/assets/table/table_1.png"
                        alt=""
                        className="h-44 w-44 object-contain sm:h-52 sm:w-52"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Mobile: centered character */}
          <div className="flex items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-5 py-12 lg:hidden">
            <img
              src="/assets/table/table_1.png"
              alt=""
              className="h-44 w-44 object-contain"
            />
          </div>
        </>
      ) : (
        <>
          {/* Desktop table */}
          <div
            className={cn(
              'hidden overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-opacity lg:block',
              isFetching && 'opacity-60'
            )}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7FAF6]">
                  {['Order', 'Customer', 'Type', 'Status', 'Items', 'Total', ''].map(header => (
                    <th
                      key={header}
                      className={cn(
                        'px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]',
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
                      className="cursor-pointer border-b border-[#E5E7EB] transition-colors last:border-0 hover:bg-[#E8F0E3]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-[0.8rem] font-bold text-[#1A1A1A]">
                          #{order._id.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-[0.72rem] text-[#6B7280]">{formatDateTime(order.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[0.85rem] font-medium text-[#1A1A1A]">
                          {orderCustomerName(order)}
                        </p>
                        {order.guestInfo?.phoneNumber && (
                          <p className="text-[0.72rem] text-[#6B7280]">
                            {order.guestInfo.phoneNumber}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <OrderTypePill type={order.orderType} />
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusPill status={order.orderStatus} />
                      </td>
                      <td className="px-4 py-3 text-[0.82rem] text-[#1A1A1A]">
                        {formatNumber(units)} item{units === 1 ? '' : 's'}
                      </td>
                      <td className="px-4 py-3 text-right text-[0.875rem] font-semibold tabular-nums text-[#1A1A1A]">
                        {formatPeso(order.totalAmount, order.totalAmount % 1 !== 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-[0.8rem] font-semibold text-[#2d4a35]">
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
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors active:bg-[#E8F0E3]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[0.78rem] font-bold text-[#1A1A1A]">
                          #{order._id.slice(-8).toUpperCase()}
                        </p>
                        <p className="truncate text-[0.85rem] text-[#1A1A1A]">
                          {orderCustomerName(order)}
                        </p>
                        <p className="text-[0.72rem] text-[#6B7280]">
                          {formatDateTime(order.createdAt)} · {formatNumber(units)} item
                          {units === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className="shrink-0 text-[0.9rem] font-bold tabular-nums text-[#1A1A1A]">
                        {formatPeso(order.totalAmount, order.totalAmount % 1 !== 0)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <OrderStatusPill status={order.orderStatus} />
                      <OrderTypePill type={order.orderType} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {!isSearching && totalPages > 1 && (
            <OrdersPagination
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
              isFetching={isFetching && !showSkeleton}
            />
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