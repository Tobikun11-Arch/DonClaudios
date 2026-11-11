'use client';

import type {CounterOrderEntry, OrderHistoryItem} from '@/lib/api/orderApi';
import {orderLabel, paymentMethodLabel} from '../counterShared';

const BUSINESS_NAME = 'DonClaudio’s Lechon House';

function money(value: number): string {
  return `₱${(Number.isFinite(value) ? value : 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function getItemName(item: OrderHistoryItem) {
  if (item.name) return item.name;
  if (item.productId && typeof item.productId === 'object') {
    return item.productId.name ?? 'Product';
  }
  return 'Product';
}

/**
 * Till-style order summary for a walk-in sale. `cashReceived` is only known
 * right after a cash charge (it is not stored), so change is shown then only.
 */
export default function CounterOrderReceipt({
  order,
  cashReceived
}: {
  order: CounterOrderEntry;
  cashReceived?: number | null;
}) {
  const items = (order.items ?? []).map(item => ({
    name: getItemName(item),
    quantity: item.quantity,
    price: item.price,
    subtotal: item.price * item.quantity
  }));
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const total = order.totalAmount;
  const discount = Math.max(0, subtotal - total);
  const paid = order.paymentStatus === 'paid';
  const voided = order.orderStatus === 'cancelled';
  const received = typeof cashReceived === 'number' ? cashReceived : null;
  const showChange =
    paid && order.paymentMethod === 'cash' && received !== null && received >= total;

  const orderDatetime = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '';

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-4 font-mono text-xs text-gray-700">
      <div className="text-center">
        <p className="font-sans text-sm font-bold text-gray-900">{BUSINESS_NAME}</p>
        <p className="mt-0.5 text-gray-500">Walk-in · {orderLabel(order)}</p>
        {orderDatetime && <p className="text-gray-500">{orderDatetime}</p>}
      </div>

      <div className="my-3 border-t border-dashed border-gray-300" />

      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex justify-between gap-3">
            <span className="min-w-0">
              <span className="tabular-nums">{item.quantity}×</span> {item.name}
            </span>
            <span className="shrink-0 tabular-nums">{money(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      <div className="my-3 border-t border-dashed border-gray-300" />

      <div className="space-y-1">
        {discount > 0 && (
          <>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="tabular-nums">-{money(discount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-sm font-bold text-gray-900">
          <span>Total</span>
          <span className="tabular-nums">{money(total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Payment</span>
          <span>
            {voided
              ? 'Voided'
              : paid
                ? paymentMethodLabel(order.paymentMethod)
                : 'Unpaid'}
          </span>
        </div>
        {showChange && received !== null && (
          <>
            <div className="flex justify-between">
              <span>Cash received</span>
              <span className="tabular-nums">{money(received)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900">
              <span>Change</span>
              <span className="tabular-nums">{money(received - total)}</span>
            </div>
          </>
        )}
      </div>

      <div className="my-3 border-t border-dashed border-gray-300" />

      <p className="text-center text-[10px] leading-relaxed text-gray-400">
        Order summary only. Not an official receipt.
      </p>
    </div>
  );
}
