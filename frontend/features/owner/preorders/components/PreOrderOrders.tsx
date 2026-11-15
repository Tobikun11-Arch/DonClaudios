'use client';

import {useMemo, useState} from 'react';
import {
  ArrowLeft,
  Bike,
  CalendarClock,
  ChevronRight,
  Download,
  Mail,
  Package,
  Phone,
  Search,
  Store,
  StickyNote
} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {FilterPills, FilterSelect} from '@/shared/components/FilterPills';
import {
  useOwnerPreOrderOrders,
  usePreOrderDetail,
  useUpdatePreOrderStatus
} from '@/lib/hooks/preorders/usePreOrders';
import type {PreOrderEvent, PreOrderOwnerOrder} from '@/lib/api/preOrderApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {OrderStatusPill} from '@/features/owner/orders/components/OrderPills';
import {OrderDetailDrawer} from '@/features/owner/orders/components/OrderDetailDrawer';
import {nextStatus, staffStatusLabel, type FlowOrder} from '@/lib/orders/orderFlow';
import {useScrollToHighlight} from '@/shared/hooks/useScrollToHighlight';
import {STATUS_STYLE, daysUntil, peso} from '@/features/preorders/utils';

export type PreOrderRole = 'owner' | 'cashier';

const PAYMENT: Record<PreOrderOwnerOrder['paymentStatus'], {label: string; className: string}> = {
  unpaid: {label: 'Unpaid', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300'},
  down_payment: {
    label: 'Down payment',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
  },
  paid: {label: 'Paid', className: 'bg-[#e9f5ee] text-[#2d4a35] dark:bg-[#7ed4a0]/15 dark:text-[#7ed4a0]'}
};

const STATUS_FILTERS = [
  {key: 'all', label: 'All'},
  {key: 'pending', label: 'Pending'},
  {key: 'confirmed', label: 'Confirmed'},
  {key: 'preparing', label: 'Preparing'},
  {key: 'ready', label: 'Ready'},
  {key: 'completed', label: 'Completed'}
];

function csvCell(v: string | number) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function placedAt(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase())
      .join('') || '?'
  );
}

function Thumb({src, size = 'h-12 w-12'}: {src?: string | null; size?: string}) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" className={`${size} shrink-0 rounded-xl object-cover`} />
  ) : (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-[#e9f5ee] text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]`}
    >
      <Package size={16} />
    </div>
  );
}

type Props = {event: PreOrderEvent; onBack: () => void; role?: PreOrderRole};

export default function PreOrderOrders({event, onBack, role = 'owner'}: Props) {
  const {data: orders = [], isLoading} = useOwnerPreOrderOrders(event._id);
  const {highlightId} = useScrollToHighlight();
  const [slot, setSlot] = useState('all');
  const [method, setMethod] = useState<'all' | 'pickup' | 'lalamove'>('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = usePreOrderDetail(openId);
  const updateStatus = useUpdatePreOrderStatus();

  // A notification can point at a cancelled pre-order: make sure it is shown.
  const highlighted = highlightId ? orders.find(o => o._id === highlightId) : undefined;
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  if (highlighted?.orderStatus === 'cancelled' && revealedFor !== highlighted._id) {
    setRevealedFor(highlighted._id);
    setShowCancelled(true);
  }

  const imageByName = useMemo(
    () => new Map(event.products.map(p => [p.name, p.imageUrl])),
    [event.products]
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter(o => {
      if (slot !== 'all' && o.slotLabel !== slot) return false;
      if (method !== 'all' && o.receiveMethod !== method) return false;
      if (status !== 'all' && o.orderStatus !== status) return false;
      if (!showCancelled && o.orderStatus === 'cancelled' && o._id !== highlightId) return false;
      if (!needle) return true;
      return [o.code, o.customerName, o.customerPhone, o.customerEmail]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [orders, slot, method, status, search, showCancelled, highlightId]);

  // Kitchen summary: pieces per product + size across active orders.
  const kitchen = useMemo(() => {
    const map = new Map<string, {name: string; size: string; qty: number; imageUrl: string | null}>();
    for (const o of orders) {
      if (o.orderStatus === 'cancelled') continue;
      for (const it of o.items) {
        const key = `${it.name}|${it.sizeLabel ?? ''}`;
        const row = map.get(key) ?? {
          name: it.name,
          size: it.sizeLabel ?? '',
          qty: 0,
          imageUrl: it.imageUrl ?? imageByName.get(it.name) ?? null
        };
        row.qty += it.quantity;
        map.set(key, row);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name) || a.size.localeCompare(b.size));
  }, [orders, imageByName]);

  const active = orders.filter(o => o.orderStatus !== 'cancelled');
  const totalValue = active.reduce((n, o) => n + o.totalAmount, 0);
  const totalPaid = active.reduce((n, o) => n + o.amountPaid, 0);
  const done = active.filter(o => o.orderStatus === 'completed').length;
  const days = daysUntil(event.pickupDate);
  const eventStatus = STATUS_STYLE[event.status];

  const statusCounts: Record<string, number> = {all: active.length};
  for (const o of active) statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] ?? 0) + 1;

  const changeStatus = (orderId: string, next: string, order?: FlowOrder | null) => {
    updateStatus.mutate(
      {orderId, status: next},
      {
        onSuccess: () => toast.success(`Moved to ${staffStatusLabel(order ?? null, next).toLowerCase()}`),
        onError: error => toast.error(getFriendlyErrorMessage(error, 'Could not change the status'))
      }
    );
  };

  const exportCsv = () => {
    const header = ['Order', 'Customer', 'Phone', 'Email', 'Slot', 'Receive', 'Items', 'Total', 'Paid', 'Payment', 'Status', 'Placed', 'Notes'];
    const rows = visible.map(o => [
      o.code,
      o.customerName,
      o.customerPhone ?? '',
      o.customerEmail ?? '',
      o.slotLabel,
      o.receiveMethod === 'lalamove' ? 'Lalamove' : 'Self pick-up',
      o.items.map(i => `${i.quantity}x ${i.name}${i.sizeLabel ? ` (${i.sizeLabel})` : ''}`).join('; '),
      o.totalAmount,
      o.amountPaid,
      PAYMENT[o.paymentStatus]?.label ?? o.paymentStatus,
      staffStatusLabel(o, o.orderStatus),
      placedAt(o.createdAt),
      o.notes ?? ''
    ]);
    const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], {type: 'text/csv;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = `preorders-${event.pickupDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const slotOptions = [
    {value: 'all', label: 'All slots'},
    ...event.slots.map(s => ({value: s.label, label: `${s.label} · ${s.booked ?? 0}/${s.limit ?? 0}`}))
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Back to pre-order dates"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold text-gray-900 dark:text-gray-100">{event.title}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${eventStatus.className}`}>
                {eventStatus.label}
              </span>
            </div>
            <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <CalendarClock size={12} /> Pickup {event.pickupDateLabel} ·{' '}
              {days < 0 ? 'pickup date has passed' : days === 0 ? 'pickup is today' : `${days} days to go`}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={visible.length === 0}>
          <Download size={15} /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {label: 'Active orders', value: String(active.length), sub: `${orders.length - active.length} cancelled`},
          {label: 'Order value', value: peso(totalValue), sub: 'Excludes cancelled'},
          {
            label: 'Paid online so far',
            value: peso(totalPaid),
            sub: totalValue > 0 ? `${Math.round((totalPaid / totalValue) * 100)}% of order value` : '—'
          },
          {label: 'Completed', value: `${done}/${active.length}`, sub: 'Handed over'}
        ].map(c => (
          <div
            key={c.label}
            className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{c.value}</p>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{c.sub}</p>
          </div>
        ))}
      </div>

      {kitchen.length > 0 && (
        <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">Kitchen summary</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {kitchen.map(k => (
              <div
                key={`${k.name}-${k.size}`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/60"
              >
                <Thumb src={k.imageUrl} size="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{k.name}</p>
                  {k.size && <p className="text-xs text-gray-500 dark:text-gray-400">{k.size}</p>}
                </div>
                <span className="rounded-lg bg-[#2d4a35] px-2.5 py-1 text-sm font-bold text-white dark:bg-[#4a7c59]">
                  {k.qty}×
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-3">
        <FilterPills
          ariaLabel="Order status"
          items={STATUS_FILTERS.map(f => ({
            key: f.key,
            label: statusCounts[f.key] ? `${f.label} (${statusCounts[f.key]})` : f.label
          }))}
          value={status}
          onChange={setStatus}
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, order #"
              aria-label="Search pre-orders"
              className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <FilterPills
            ariaLabel="Receive method"
            items={[
              {key: 'all', label: 'All'},
              {key: 'pickup', label: 'Self pick-up'},
              {key: 'lalamove', label: 'Lalamove'}
            ]}
            value={method}
            onChange={v => setMethod(v as typeof method)}
          />
          <FilterSelect
            ariaLabel="Pickup slot"
            className="w-48"
            value={slot}
            onChange={setSlot}
            options={slotOptions}
          />
          <label className="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={e => setShowCancelled(e.target.checked)}
              className="accent-[#4a7c59]"
            />
            Show cancelled
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {orders.length === 0 ? 'No pre-orders here yet.' : 'No pre-orders match these filters.'}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map(o => {
            const next = nextStatus(o);
            const paidPct = o.totalAmount > 0 ? Math.min(100, Math.round((o.amountPaid / o.totalAmount) * 100)) : 0;
            return (
              <article
                key={o._id}
                id={`order-${o._id}`}
                className={`flex flex-col rounded-2xl border bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:bg-gray-900 ${
                  o._id === highlightId
                    ? 'border-[#4a7c59] dark:border-[#7ed4a0]/60'
                    : 'border-gray-100 dark:border-gray-700'
                } ${o.orderStatus === 'cancelled' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9f5ee] text-sm font-bold text-[#2d4a35] dark:bg-[#7ed4a0]/15 dark:text-[#7ed4a0]">
                    {initials(o.customerName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                        {o.customerName}
                        <span className="ml-1.5 font-mono text-xs font-semibold text-gray-400">{o.code}</span>
                      </p>
                      <OrderStatusPill status={o.orderStatus} order={o} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                      {o.customerPhone && (
                        <a
                          href={`tel:${o.customerPhone}`}
                          className="inline-flex items-center gap-1 text-[#2d4a35] hover:underline dark:text-[#7ed4a0]"
                        >
                          <Phone size={11} /> {o.customerPhone}
                        </a>
                      )}
                      {o.customerEmail && (
                        <span className="inline-flex min-w-0 items-center gap-1 text-gray-500 dark:text-gray-400">
                          <Mail size={11} /> <span className="truncate">{o.customerEmail}</span>
                        </span>
                      )}
                      <span className="text-gray-400 dark:text-gray-500">Placed {placedAt(o.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                    <CalendarClock size={12} /> {o.slotLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {o.receiveMethod === 'lalamove' ? <Bike size={12} /> : <Store size={12} />}
                    {o.receiveMethod === 'lalamove' ? 'Lalamove' : 'Self pick-up'}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT[o.paymentStatus]?.className ?? ''}`}>
                    {PAYMENT[o.paymentStatus]?.label ?? o.paymentStatus}
                    {o.paymentChannel ? ` · ${o.paymentChannel.toUpperCase()}` : ''}
                  </span>
                </div>

                <ul className="mt-3 space-y-2">
                  {o.items.map((it, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Thumb src={it.imageUrl ?? imageByName.get(it.name)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{it.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {it.sizeLabel ? `${it.sizeLabel} · ` : ''}
                          {it.quantity} × {peso(it.price)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                        {peso(it.price * it.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                {o.notes && (
                  <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    <StickyNote size={12} className="mt-0.5 shrink-0" /> {o.notes}
                  </p>
                )}
                {o.orderStatus === 'cancelled' && o.cancelReason && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                    Cancelled: {o.cancelReason}
                  </p>
                )}

                <div className="mt-auto pt-3">
                  <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Paid {peso(o.amountPaid)} of{' '}
                      <b className="text-gray-900 dark:text-gray-100">{peso(o.totalAmount)}</b>
                    </span>
                    <span>{paidPct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-[#4a7c59] dark:bg-[#7ed4a0]"
                      style={{width: `${paidPct}%`}}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                    <Button size="sm" variant="outline" onClick={() => setOpenId(o._id)}>
                      View details <ChevronRight size={14} />
                    </Button>
                    {next && (
                      <Button
                        size="sm"
                        disabled={updateStatus.isPending}
                        onClick={() => changeStatus(o._id, next, o)}
                        className="bg-[#2d4a35] text-white hover:bg-[#3a5c44] dark:bg-[#4a7c59] dark:hover:bg-[#5a8f6a]"
                      >
                        Mark {staffStatusLabel(o, next).toLowerCase()}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {openId && detail.isLoading && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/40 border-t-white" />
        </div>
      )}
      <OrderDetailDrawer
        order={openId && detail.data ? detail.data : null}
        onClose={() => setOpenId(null)}
        onUpdateStatus={(id, next) => changeStatus(id, next, detail.data)}
        isUpdating={updateStatus.isPending}
        allowCancel={role === 'owner'}
      />
    </div>
  );
}
