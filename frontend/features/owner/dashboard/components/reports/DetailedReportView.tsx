'use client';

import {useEffect, useState} from 'react';
import {useQuery, keepPreviousData} from '@tanstack/react-query';
import {ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Loader2, Search} from 'lucide-react';
import {toast} from 'sonner';
import {
  downloadReportDetail,
  getReportDetail,
  type DetailFilters,
  type DetailView
} from '@/lib/api/reportApi';
import type {ReportRange} from '@/lib/types/report';
import {triggerBlobDownload} from '@/lib/utils/csvExport';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {cn} from '@/lib/utils';

const PAGE_SIZE = 50;
/** The staff log is read event by event, so it pages in tens. */
const STAFF_PAGE_SIZE = 10;
const PRESENCE = [
  {value: 'online', label: 'Online'},
  {value: 'offline', label: 'Offline'}
];

const ORDER_TYPES = [
  {value: 'pickup', label: 'Pick-up'},
  {value: 'delivery', label: 'Delivery'},
  {value: 'reservation', label: 'Reservation'}
];
const PAYMENTS = [
  {value: 'cash', label: 'Cash'},
  {value: 'gcash', label: 'GCash'},
  {value: 'maya', label: 'Maya'},
  {value: 'card', label: 'Card'},
  {value: 'grabpay', label: 'GrabPay'},
  {value: 'shopeepay', label: 'ShopeePay'},
  {value: 'bdo', label: 'BDO'},
  {value: 'bpi', label: 'BPI'}
];
const STATUSES = [
  {value: 'pending', label: 'Pending'},
  {value: 'confirmed', label: 'Confirmed'},
  {value: 'preparing', label: 'Preparing'},
  {value: 'ready', label: 'Ready'},
  {value: 'on_the_way', label: 'On the way'},
  {value: 'completed', label: 'Completed'},
  {value: 'cancelled', label: 'Cancelled'}
];

type Column = {key: string; label: string; type?: 'text' | 'money' | 'number' | 'datetime' | 'date'};

function formatCell(value: unknown, type?: Column['type']) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'money' && typeof value === 'number') {
    return `₱${value.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
  if (type === 'number' && typeof value === 'number') return value.toLocaleString('en-PH');
  if (type === 'datetime' && typeof value === 'string') {
    return new Date(value).toLocaleString('en-PH', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
  }
  if (type === 'date' && typeof value === 'string') {
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', {month: 'short', day: 'numeric', year: 'numeric'});
  }
  return String(value);
}

const isNumeric = (c: Column) => c.type === 'money' || c.type === 'number';

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{value: string; label: string}>;
}) {
  return (
    <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6B7280] dark:text-gray-400 sm:flex-none">
      {label}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm font-normal normal-case tracking-normal text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value="">All</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Reports > Detailed: every row behind a report tab (each order, each
 * product per day, each customer, each staff action), with filters, 50 rows
 * per page (10 for Staff), totals over all matching rows, and CSV / PDF of
 * the same rows. Filters and paging run on the server.
 */
export function DetailedReportView({view, range}: {view: DetailView; range: ReportRange}) {
  const [filters, setFilters] = useState<DetailFilters>({});
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const pageSize = view === 'staff' ? STAFF_PAGE_SIZE : PAGE_SIZE;

  // Search as you type, one request after a short pause.
  useEffect(() => {
    const search = searchText.trim() || undefined;
    if (search === filters.search) return;
    const timer = setTimeout(() => {
      setFilters(f => ({...f, search}));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, filters.search]);

  const query = useQuery({
    queryKey: ['report', 'detail', view, range, filters, page, pageSize],
    queryFn: () => getReportDetail(view, range, filters, page, pageSize),
    placeholderData: keepPreviousData,
    staleTime: 30_000
  });
  const data = query.data;
  const columns = (data?.columns ?? []) as Column[];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const setFilter = (key: keyof DetailFilters, value: string) => {
    setFilters(f => ({...f, [key]: value || undefined}));
    setPage(1);
  };

  const exportAs = async (format: 'csv' | 'pdf') => {
    setBusy(format);
    try {
      const {blob, filename} = await downloadReportDetail(view, range, filters, format);
      triggerBlobDownload(blob, filename);
      toast.success(format === 'csv' ? 'CSV downloaded' : 'PDF downloaded');
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Export failed'));
    } finally {
      setBusy(null);
    }
  };

  const orderFilters = view === 'sales' || view === 'operations';
  const btn =
    'inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-[#2d4a35] hover:bg-[#e9f5ee] disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-[#7ed4a0]';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
        {view === 'staff' ? (
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6B7280] dark:text-gray-400 sm:max-w-xs">
            Search
            <span className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Staff name or order #"
                className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2 text-sm font-normal normal-case tracking-normal text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </span>
          </label>
        ) : null}
        <Select
          label={view === 'staff' ? 'Staff' : 'Cashier'}
          value={filters.cashierId ?? ''}
          onChange={v => setFilter('cashierId', v)}
          options={(data?.cashiers ?? []).map(c => ({value: c.id, label: c.name}))}
        />
        {view === 'staff' ? (
          <Select
            label="Status"
            value={filters.presence ?? ''}
            onChange={v => setFilter('presence', v)}
            options={PRESENCE}
          />
        ) : (
          <>
            <Select label="Order type" value={filters.orderType ?? ''} onChange={v => setFilter('orderType', v)} options={ORDER_TYPES} />
            <Select label="Payment" value={filters.paymentMethod ?? ''} onChange={v => setFilter('paymentMethod', v)} options={PAYMENTS} />
          </>
        )}
        {orderFilters ? (
          <Select label="Status" value={filters.status ?? ''} onChange={v => setFilter('status', v)} options={STATUSES} />
        ) : null}
        <div className="ml-auto flex gap-2">
          <button type="button" className={btn} disabled={busy !== null || !data?.total} onClick={() => exportAs('csv')}>
            {busy === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Export CSV
          </button>
          <button type="button" className={btn} disabled={busy !== null || !data?.total} onClick={() => exportAs('pdf')}>
            {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Export PDF
          </button>
        </div>
      </div>

      {view === 'products' || view === 'customers' ? (
        <p className="text-xs text-[#6B7280] dark:text-gray-400">Completed sales only, like the summary.</p>
      ) : null}

      <div className="rounded-xl border border-[#E5E7EB] bg-white dark:border-gray-700 dark:bg-gray-900">
        {query.isLoading ? (
          <div className="p-6 text-sm text-[#6B7280] dark:text-gray-400">Loading rows…</div>
        ) : query.isError || !data ? (
          <div className="p-6 text-sm text-red-600 dark:text-red-400">
            {getFriendlyErrorMessage(query.error, 'Failed to load the detailed report.')}
          </div>
        ) : data.total === 0 ? (
          <div className="p-6 text-sm text-[#6B7280] dark:text-gray-400">No rows for this range and filters.</div>
        ) : (
          <>
            {/* Desktop: full table, scrolls sideways inside the card. */}
            <div className={cn('hidden overflow-x-auto md:block', query.isFetching && 'opacity-70')}>
              <table className="w-full min-w-[720px] text-left text-[0.82rem]">
                <thead className="bg-[#F7F8F6] text-[0.72rem] uppercase tracking-[0.05em] text-[#6B7280] dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    {columns.map(c => (
                      <th key={c.key} className={cn('whitespace-nowrap px-3 py-2 font-semibold', isNumeric(c) && 'text-right')}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100 align-top dark:border-gray-800">
                      {columns.map(c => (
                        <td
                          key={c.key}
                          className={cn(
                            'px-3 py-2 text-[#1A1A1A] dark:text-gray-100',
                            isNumeric(c) ? 'whitespace-nowrap text-right tabular-nums' : c.key === 'items' ? 'min-w-[200px]' : 'whitespace-nowrap'
                          )}
                        >
                          {formatCell(row[c.key], c.type)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {Object.keys(data.totals).length ? (
                  <tfoot>
                    <tr className="border-t-2 border-[#2d4a35]/30 bg-[#F7F8F6] font-semibold dark:bg-gray-800">
                      {columns.map((c, i) => (
                        <td key={c.key} className={cn('px-3 py-2 tabular-nums', isNumeric(c) && 'text-right')}>
                          {i === 0 ? `Total (${data.total} rows)` : c.key in data.totals ? formatCell(data.totals[c.key], c.type) : ''}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>

            {/* Phones: one tap-to-expand card per row. */}
            <ul className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
              {data.rows.map((row, i) => {
                const open = openRow === i;
                const [first, second, ...rest] = columns;
                const headline = columns.find(c => c.type === 'money') ?? columns.find(c => c.type === 'number');
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setOpenRow(open ? null : i)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#1A1A1A] dark:text-gray-100">
                          {formatCell(row[second?.key ?? ''], second?.type)}
                        </span>
                        <span className="block text-xs text-[#6B7280] dark:text-gray-400">
                          {formatCell(row[first?.key ?? ''], first?.type)}
                        </span>
                      </span>
                      {headline ? (
                        <span className="text-sm font-semibold tabular-nums text-[#1A1A1A] dark:text-gray-100">
                          {formatCell(row[headline.key], headline.type)}
                        </span>
                      ) : null}
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
                    </button>
                    {open ? (
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-4 pb-3 text-xs">
                        {rest.map(c => (
                          <div key={c.key} className={c.key === 'items' || c.key === 'action' ? 'col-span-2' : ''}>
                            <dt className="text-[#6B7280] dark:text-gray-400">{c.label}</dt>
                            <dd className="break-words font-medium text-[#1A1A1A] dark:text-gray-100">{formatCell(row[c.key], c.type)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </li>
                );
              })}
              {Object.keys(data.totals).length ? (
                <li className="bg-[#F7F8F6] px-4 py-3 text-xs dark:bg-gray-800">
                  <p className="font-semibold text-[#1A1A1A] dark:text-gray-100">Total ({data.total} rows)</p>
                  {columns
                    .filter(c => c.key in data.totals)
                    .map(c => (
                      <p key={c.key} className="text-[#374151] dark:text-gray-300">
                        {c.label}: <span className="font-semibold">{formatCell(data.totals[c.key], c.type)}</span>
                      </p>
                    ))}
                </li>
              ) : null}
            </ul>

            <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-2 text-sm dark:border-gray-800">
              <span className="text-[#6B7280] dark:text-gray-400">
                Page {data.page} of {totalPages} · {data.total} rows
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Previous page"
                  className={btn}
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  className={btn}
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
