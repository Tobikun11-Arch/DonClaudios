import type {OrderDocument, OrderStatus} from '../models/Order.model';
import {adminRepository} from '../repositories/admin.repository';
import {productRepository} from '../repositories/product.repository';

/** Grace period added on top of the estimate before an order counts as late. */
export const OVERDUE_GRACE_MINUTES = 5;

/** Fallback used before an admin has configured their own default. */
export const FALLBACK_PREP_MINUTES = 20;

export const MAX_PREP_MINUTES = 1440;

export interface OrderPrepTiming {
  preparingAt: Date | null;
  dueAt: Date | null;
  estimatedPrepMinutes: number | null;
  isOverdue: boolean;
  /** Positive = minutes left. Negative = minutes past due. Null when not applicable. */
  minutesRemaining: number | null;
  isRunning: boolean;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sanitizePrepMinutes(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(MAX_PREP_MINUTES, Math.round(n));
}

export async function getDefaultPrepMinutes(): Promise<number> {
  const admins = await adminRepository.listAll();
  return sanitizePrepMinutes(admins[0]?.defaultPrepMinutes) ?? FALLBACK_PREP_MINUTES;
}

/**
 * Order estimate is the SLOWEST item, not the sum. A kitchen cooks the rice and
 * the drinks alongside the main dish, so 30min kare-kare + 10min side dish is
 * still a 30min order. Quantity is deliberately ignored for the same reason.
 */
export function estimateOrderPrepMinutes(itemPrepMinutes: number[]): number {
  const values = itemPrepMinutes
    .map(sanitizePrepMinutes)
    .filter((n): n is number => n !== null);
  return values.length > 0 ? Math.max(...values) : 0;
}

/**
 * Resolves the prep time for every product in an order and returns the item
 * snapshots plus the order-level estimate. Products without an explicit time
 * fall back to the admin's global default so nothing is ever unfairly flagged.
 */
export async function buildPrepSnapshot(
  productIds: string[],
  orderType: string
) {
  const fallback = await getDefaultPrepMinutes();
  const prepByProduct = new Map<string, number>();

  if (productIds.length > 0) {
    const products = await productRepository.findByIds(productIds);
    for (const product of products) {
      const minutes = sanitizePrepMinutes(product.prepTimeMinutes) ?? fallback;
      prepByProduct.set(String(product._id), minutes);
    }
  }

  const itemPreps = productIds.map(
    id => prepByProduct.get(String(id)) ?? fallback
  );

  // Reservations (whole lechon events) are never timed or flagged.
  if (orderType === 'reservation') {
    return {itemPreps, estimatedPrepMinutes: null, estimatedReadyAt: null};
  }

  const estimatedPrepMinutes = estimateOrderPrepMinutes(itemPreps);
  const estimatedReadyAt = new Date(
    Date.now() + estimatedPrepMinutes * 60_000
  );

  return {itemPreps, estimatedPrepMinutes, estimatedReadyAt};
}

/** When the order most recently entered `preparing`. Null if it never has. */
export function getPreparingAt(order: OrderDocument): Date | null {
  const history = order.statusHistory;
  if (!Array.isArray(history) || history.length === 0) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].status === 'preparing') return toDate(history[i].at);
  }
  return null;
}

/** Reservations and walk-in POS orders are deliberately excluded. */
export function isTrackableOrder(order: {
  orderType?: string;
  orderSource?: string;
  estimatedPrepMinutes?: number | null;
}) {
  if (order.orderType === 'reservation') return false;
  if (order.orderSource === 'in-store') return false;
  const minutes = sanitizePrepMinutes(order.estimatedPrepMinutes);
  return minutes !== null && minutes > 0;
}

export function getOverdueAt(order: {
  orderStatus?: OrderStatus;
  orderType?: string;
  orderSource?: string;
  estimatedPrepMinutes?: number | null;
  statusHistory?: Array<{status: OrderStatus; at: Date}>;
}): Date | null {
  if (order.orderStatus !== 'preparing') return null;
  if (!isTrackableOrder(order)) return null;

  const preparingAt = getPreparingAt(order as OrderDocument);
  if (!preparingAt) return null;

  const minutes = sanitizePrepMinutes(order.estimatedPrepMinutes) as number;
  return new Date(
    preparingAt.getTime() + (minutes + OVERDUE_GRACE_MINUTES) * 60_000
  );
}

/**
 * Pure, request-time evaluation. No writes — this is what makes it safe to run
 * on every 5s poll.
 */
export function evaluateOrderTiming(
  order: OrderDocument,
  now = new Date()
): OrderPrepTiming {
  const dueAt = getOverdueAt(order);
  const minutesRemaining = dueAt
    ? Math.ceil((dueAt.getTime() - now.getTime()) / 60_000)
    : null;

  return {
    preparingAt: getPreparingAt(order),
    dueAt,
    estimatedPrepMinutes: sanitizePrepMinutes(order.estimatedPrepMinutes),
    isOverdue: dueAt !== null && now.getTime() > dueAt.getTime(),
    minutesRemaining,
    isRunning: order.orderStatus === 'preparing'
  };
}
