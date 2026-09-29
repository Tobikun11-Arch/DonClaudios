'use client';

import {useMemo, useState} from 'react';
import {Search} from 'lucide-react';
import {cn} from '@/lib/utils';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {ReportRangePicker, rangeLabel} from '@/features/owner/dashboard/components/reports/ReportRangePicker';
import {ReportExportBar} from '@/features/owner/dashboard/components/reports/ReportExportBar';
import {
  formatNumber,
  formatPeso
} from '@/features/owner/dashboard/components/reports/reportPrimitives';
import {OrderStatusPill, OrderTypePill, ORDER_STATUSES} from './OrderPills';
import {OrderDetailDrawer} from './OrderDetailDrawer';
import {
  filterOrders,
  itemName,
  orderCustomerName,
  useOrderFilters,
  useOwnerOrders
} from '../hooks/useOwnerOrders';
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

const CASH_COLUMNS = [
  {header: 'Order', value: (r: Record<string, string | number>) => r.id},
  {header: 'Customer', value: (r: Record<string, string | number>) => r.customer},
  {header: 'Type', value: (r: Record<string, string | number>) => r.type},
  {header: 'Status', value: (r: Record<string, string | number>) => r.status},
  {header: 'Items', value: (r: Record<string, string | number>) => r.items},
  {header: 'Total', value: (r: Record<string, string | number>) => r.total}
] as const;

function orderRow(order: OrderHistoryEntry) {
  const items = order.items ?? [];
  return {
    id: order._id,
    customer: orderCustomerName(order),
    type: order.orderType,
    status: order.orderStatus,
    items: items.map(item => `${item.quantity}x ${itemName(item) || 'Removed product'}`).join('; '),
    total: order.totalAmount
  };
}

export default function OwnerOrdersPage() {
  const [range, setRange] = useState<ReportRange>({preset: '7d'});
  const filters = useOrderFilters();
  const [selected, setSelected] = useState<OrderHistoryEntry | null>(null);

  const {orders, isLoading, isError, error, updateStatus, isUpdatingStatus} = useOwnerOrders(range);

  const visible = useMemo(() => filterOrders(orders, filters), [orders, filters]);

  const csvRows = useMemo(() => visible.map(orderRow), [visible]);

  const revenue = visible
    .filter(o => o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[1.5rem] font-bold text-[#1A1A1A]">Orders</h1>
          <p className="text-[0.875rem] text-[#6B7280]">
            {isLoading
              ? 'Loading orders…'
              : `${formatNumber(visible.length)} order${visible.length === 1 ? '' : 's'} · ${formatPeso(revenue, revenue % 1 !== 0)} revenue`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportRangePicker value={range} onChange={setRange} />
          <ReportExportBar
            view="sales"
            range={range}
            rows={csvRows as Array<Record<string, string | number>>}
            columns={CASH_COLUMNS as never}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative sm:max-w-xs">
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

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {[{value: 'all', label: 'All'}, ...ORDER_STATUSES.map(s => ({value: s, label: s.replace(/_/g, ' ')}))].map(
            option => {
              const active = filters.status === option.value;
              const count =
                option.value === 'all'
                  ? orders.length
                  : orders.filter(o => o.orderStatus === option.value).length;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => filters.setStatus(option.value)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold capitalize transition-colors',
                    active
                      ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  )}
                >
                  {option.label}
                  <span
                    className={cn(
                      'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold',
                      active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {[
            {value: 'all', label: 'All types'},
            {value: 'pickup', label: 'Pickup'},
            {value: 'delivery', label: 'Delivery'},
            {value: 'reservation', label: 'Reservation'}
          ].map(option => {
            const active = filters.type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => filters.setType(option.value)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  active
                    ? 'border-[#2d4a35] bg-[#E8F0E3] text-[#2d4a35]'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-600">
          {getFriendlyErrorMessage(error, 'Failed to load orders')}
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-16 text-center text-sm text-[#6B7280]">
          Loading orders…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-16 text-center">
          <p className="text-sm font-medium text-[#1A1A1A]">No orders match these filters</p>
          <p className="mt-1 text-[0.8rem] text-[#6B7280]">
            {rangeLabel(range)} · try a wider date range or clear the filters.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
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
          <ul className="space-y-2.5 lg:hidden">
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
