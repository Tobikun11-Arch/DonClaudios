import type {CounterOrderEntry} from '@/lib/api/orderApi';

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  qty: number;
  maxQty: number;
  originalQty?: number;
};

export const PAYMENT_METHODS = [
  {value: 'cash', label: 'Cash'},
  {value: 'gcash', label: 'GCash'},
  {value: 'card', label: 'Card'},
  {value: 'other', label: 'Other'}
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

export const FALLBACK_PRODUCT_IMAGE = '/assets/sample_menu.png';

export function paymentMethodLabel(value?: string | null): string {
  return PAYMENT_METHODS.find(m => m.value === value)?.label ?? 'Cash';
}

export function orderLabel(order: CounterOrderEntry): string {
  return order.orderNumber ?? `DC-${String(order._id).slice(-6).toUpperCase()}`;
}

/** Peso amount, decimals only when the value has them (₱1,250 / ₱99.50). */
export function peso(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const hasCents = Math.round(safe * 100) % 100 !== 0;
  return `₱${safe.toLocaleString('en-PH', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Quick "cash received" amounts a cashier is likely to be handed: the exact
 * total, then the next round bills above it.
 */
export function quickCashAmounts(total: number): number[] {
  if (total <= 0) return [];
  const steps = [50, 100, 500, 1000];
  const amounts = new Set<number>([total]);
  for (const step of steps) {
    const rounded = Math.ceil(total / step) * step;
    if (rounded > total) amounts.add(rounded);
    if (amounts.size >= 4) break;
  }
  return Array.from(amounts).sort((a, b) => a - b);
}
