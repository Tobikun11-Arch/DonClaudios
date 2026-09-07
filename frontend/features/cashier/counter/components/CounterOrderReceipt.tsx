'use client';

import type {CounterOrderEntry, OrderHistoryItem} from '@/lib/api/orderApi';

const BUSINESS_NAME = 'DonClaudio’s Lechon House';

function money(value: number): string {
  return `₱${(Number.isFinite(value) ? value : 0).toLocaleString(undefined, {
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

const ORDER_TYPE_LABEL: Record<string, string> = {
  pickup: 'Pickup',
  delivery: 'Delivery',
  reservation: 'Reservation'
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  gcash: 'GCash',
  other: 'Other'
};

export default function CounterOrderReceipt({order}: {order: CounterOrderEntry}) {
  const items = (order.items ?? []).map(item => ({
    name: getItemName(item),
    quantity: item.quantity,
    price: item.price,
    subtotal: item.price * item.quantity
  }));
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const total = order.totalAmount;
  const discount = Math.max(0, subtotal - total);

  const customerName = order.guestInfo
    ? [order.guestInfo.firstName, order.guestInfo.lastName]
        .filter(Boolean)
        .join(' ')
    : order.customerName || 'there';

  const orderNumber = `#${String(order._id).slice(-6).toUpperCase()}`;
  const orderDatetime = order.createdAt
    ? new Date(order.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '';
  const orderType = ORDER_TYPE_LABEL[order.orderType] ?? order.orderType;
  const paymentMethod =
    PAYMENT_LABEL[order.paymentMethod ?? 'cash'] ?? 'Cash';

  return (
    <div className="mx-auto w-full max-w-md bg-white">
      <div className="border-b border-gray-200 bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-white">{BUSINESS_NAME}</p>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">
            Order Summary
          </span>
        </div>
      </div>

      <div className="px-6 py-5">
        <p className="text-sm text-gray-900">
          Hi <span className="font-bold">{customerName}</span>,
        </p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Thanks for your order! Here&apos;s a summary for your records. This is not an
          official receipt / invoice.
        </p>
      </div>

      <div className="px-6 pb-2 text-xs text-gray-600">
        <div className="flex justify-between py-1">
          <span className="font-bold">Order No.</span>
          <span>{orderNumber}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="font-bold">Date &amp; Time</span>
          <span>{orderDatetime}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="font-bold">Order Type</span>
          <span>{orderType}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="font-bold">Payment Method</span>
          <span>{paymentMethod}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="font-bold">Status</span>
          <span
            className={
              order.orderStatus === 'cancelled'
                ? 'rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600'
                : 'rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700'
            }
          >
            {order.orderStatus === 'cancelled' ? 'Voided' : 'Completed'}
          </span>
        </div>
      </div>

      <div className="px-6 pb-2">
        <div className="border-t border-gray-200" />
        <table className="mt-3 w-full text-xs text-gray-800">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-gray-400">
              <th className="pb-2 text-left font-medium">Item</th>
              <th className="pb-2 text-center font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Price</th>
              <th className="pb-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-t border-gray-100">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">{money(item.price)}</td>
                <td className="py-2 text-right">{money(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 pb-2 text-xs text-gray-600">
        <div className="flex justify-between py-1">
          <span>Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between py-1">
            <span>Discount</span>
            <span>-{money(discount)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-gray-200 py-2 text-sm font-bold text-gray-900">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
      </div>

      <div className="px-6 pb-4">
        <p className="text-[10px] leading-relaxed text-gray-400">
          This order summary is provided for your reference only and does not
          serve as an official receipt or invoice.
        </p>
      </div>

      <div className="bg-gray-50 px-6 py-4 text-center">
        <p className="text-[11px] text-gray-400">{BUSINESS_NAME}</p>
      </div>
    </div>
  );
}
