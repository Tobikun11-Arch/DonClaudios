'use client';

import {useMemo, useState} from 'react';
import {ArrowLeft, Bike, Download, Phone, Store} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {FilterPills, FilterSelect} from '@/shared/components/FilterPills';
import {useOwnerPreOrderOrders} from '@/lib/hooks/preorders/usePreOrders';
import type {PreOrderEvent, PreOrderOwnerOrder} from '@/lib/api/preOrderApi';
import {peso} from '@/features/preorders/utils';

const PAYMENT: Record<PreOrderOwnerOrder['paymentStatus'], {label: string; className: string}> = {
  unpaid: {label: 'Unpaid', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300'},
  down_payment: {
    label: 'Down payment',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
  },
  paid: {label: 'Paid', className: 'bg-[#e9f5ee] text-[#2d4a35] dark:bg-[#7ed4a0]/15 dark:text-[#7ed4a0]'}
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

function csvCell(v: string | number) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type Props = {event: PreOrderEvent; onBack: () => void};

export default function PreOrderOrders({event, onBack}: Props) {
  const {data: orders = [], isLoading} = useOwnerPreOrderOrders(event._id);
  const [slot, setSlot] = useState('all');
  const [method, setMethod] = useState<'all' | 'pickup' | 'lalamove'>('all');
  const [showCancelled, setShowCancelled] = useState(false);

  const visible = useMemo(
    () =>
      orders.filter(
        o =>
          (slot === 'all' || o.slotLabel === slot) &&
          (method === 'all' || o.receiveMethod === method) &&
          (showCancelled || o.orderStatus !== 'cancelled')
      ),
    [orders, slot, method, showCancelled]
  );

  // Kitchen summary: pieces per product + size across active orders.
  const kitchen = useMemo(() => {
    const map = new Map<string, {name: string; size: string; qty: number}>();
    for (const o of orders) {
      if (o.orderStatus === 'cancelled') continue;
      for (const it of o.items) {
        const key = `${it.name}|${it.sizeLabel ?? ''}`;
        const row = map.get(key) ?? {name: it.name, size: it.sizeLabel ?? '', qty: 0};
        row.qty += it.quantity;
        map.set(key, row);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name) || a.size.localeCompare(b.size));
  }, [orders]);

  const active = orders.filter(o => o.orderStatus !== 'cancelled');
  const totalValue = active.reduce((n, o) => n + o.totalAmount, 0);
  const totalPaid = active.reduce((n, o) => n + o.amountPaid, 0);

  const exportCsv = () => {
    const header = ['Order', 'Customer', 'Phone', 'Slot', 'Receive', 'Items', 'Total', 'Paid', 'Payment', 'Status', 'Notes'];
    const rows = visible.map(o => [
      o.code,
      o.customerName,
      o.customerPhone ?? '',
      o.slotLabel,
      o.receiveMethod === 'lalamove' ? 'Lalamove' : 'Self pick-up',
      o.items.map(i => `${i.quantity}x ${i.name}${i.sizeLabel ? ` (${i.sizeLabel})` : ''}`).join('; '),
      o.totalAmount,
      o.amountPaid,
      PAYMENT[o.paymentStatus]?.label ?? o.paymentStatus,
      STATUS_LABEL[o.orderStatus] ?? o.orderStatus,
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
    ...event.slots.map(s => ({value: s.label, label: s.label}))
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Back to pre-order dates"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{event.title}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pickup {event.pickupDateLabel}</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={visible.length === 0}>
          <Download size={15} /> Export CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {label: 'Active orders', value: String(active.length)},
          {label: 'Order value', value: peso(totalValue)},
          {label: 'Paid online so far', value: peso(totalPaid)}
        ].map(c => (
          <div
            key={c.label}
            className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
          >
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{c.value}</p>
          </div>
        ))}
      </div>

      {kitchen.length > 0 && (
        <section className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <h2 className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100">Kitchen summary</h2>
          <div className="flex flex-wrap gap-2">
            {kitchen.map(k => (
              <span
                key={`${k.name}-${k.size}`}
                className="rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1 text-xs text-gray-700 dark:text-gray-200"
              >
                <b className="text-[#2d4a35] dark:text-[#7ed4a0]">{k.qty}×</b> {k.name}
                {k.size ? ` · ${k.size}` : ''}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
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
          className="w-40"
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

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          No pre-orders here yet.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(o => (
            <div
              key={o._id}
              className={`rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 ${
                o.orderStatus === 'cancelled' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {o.code} · {o.customerName}
                  </p>
                  {o.customerPhone && (
                    <a
                      href={`tel:${o.customerPhone}`}
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#2d4a35] hover:underline dark:text-[#7ed4a0]"
                    >
                      <Phone size={12} /> {o.customerPhone}
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {o.slotLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {o.receiveMethod === 'lalamove' ? <Bike size={12} /> : <Store size={12} />}
                    {o.receiveMethod === 'lalamove' ? 'Lalamove' : 'Self pick-up'}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT[o.paymentStatus]?.className ?? ''}`}
                  >
                    {PAYMENT[o.paymentStatus]?.label ?? o.paymentStatus}
                  </span>
                  <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    {STATUS_LABEL[o.orderStatus] ?? o.orderStatus}
                  </span>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                {o.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>
                      {it.quantity}× {it.name}
                      {it.sizeLabel && (
                        <span className="text-gray-500 dark:text-gray-400"> · {it.sizeLabel}</span>
                      )}
                    </span>
                    <span className="tabular-nums">{peso(it.price * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <span>{o.notes ? `Note: ${o.notes}` : ''}</span>
                <span>
                  Paid {peso(o.amountPaid)} of{' '}
                  <b className="text-gray-900 dark:text-gray-100">{peso(o.totalAmount)}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
