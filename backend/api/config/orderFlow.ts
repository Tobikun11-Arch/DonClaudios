/**
 * Order status flow per kind of order — enforced here.
 * Mirrored by `frontend/lib/orders/orderFlow.ts` for the UI. Keep in sync.
 *
 *   store_delivery   (free, DonClaudio's rider)  confirmed → preparing → on_the_way → completed
 *   courier_delivery (customer books a courier)  confirmed → preparing → ready      → completed
 *   pickup                                       confirmed → preparing → ready      → completed
 *   reservation                                  confirmed → preparing → ready      → completed
 *
 * For a customer-booked courier the store's job ends when it hands the food
 * to the rider, so "on the way" only exists for the store's own rider.
 */
import type {OrderStatus} from '../models/Order.model';

export type FulfillmentKind =
  | 'store_delivery'
  | 'courier_delivery'
  | 'pickup'
  | 'reservation';

export const COURIER_PROVIDERS = ['lalamove', 'grab_express', 'move_it', 'other'] as const;
export type CourierProvider = (typeof COURIER_PROVIDERS)[number];

const COURIER_LABELS: Record<CourierProvider, string> = {
  lalamove: 'Lalamove',
  grab_express: 'Grab Express',
  move_it: 'Move It',
  other: 'Other'
};

export type OrderCourier = {provider: CourierProvider; name?: string | null};

export type FlowOrder = {
  orderType: string;
  deliveryMode?: string | null;
  courier?: OrderCourier | null;
};

export function fulfillmentKind(order: FlowOrder): FulfillmentKind {
  if (order.orderType === 'delivery') {
    return order.deliveryMode === 'DONCLAUDIO' ? 'store_delivery' : 'courier_delivery';
  }
  if (order.orderType === 'reservation') return 'reservation';
  return 'pickup';
}

export function courierLabel(courier?: OrderCourier | null): string {
  if (!courier) return 'Lalamove';
  if (courier.provider === 'other') return courier.name?.trim() || 'your courier';
  return COURIER_LABELS[courier.provider] ?? 'your courier';
}

const FLOWS: Record<FulfillmentKind, OrderStatus[]> = {
  store_delivery: ['pending', 'confirmed', 'preparing', 'on_the_way', 'completed'],
  courier_delivery: ['pending', 'confirmed', 'preparing', 'ready', 'completed'],
  pickup: ['pending', 'confirmed', 'preparing', 'ready', 'completed'],
  reservation: ['pending', 'confirmed', 'preparing', 'ready', 'completed']
};

export function statusFlow(order: FlowOrder): OrderStatus[] {
  return FLOWS[fulfillmentKind(order)];
}

/** Whether `status` is a step this kind of order can be moved to. */
export function isStatusAllowed(order: FlowOrder, status: OrderStatus): boolean {
  return status === 'cancelled' || statusFlow(order).includes(status);
}

/** Why a status is not allowed for this order, for the staff error toast. */
export function staffFlowError(order: FlowOrder, status: string): string {
  const kind = fulfillmentKind(order);
  if (status === 'on_the_way') {
    return kind === 'courier_delivery'
      ? 'The customer booked their own courier: mark it "ready" for the courier, then "completed" once the rider picks it up.'
      : 'Only deliveries by our own rider can be marked as on the way.';
  }
  if (status === 'ready' && kind === 'store_delivery') {
    return 'Deliveries by our own rider go "on the way" instead of "ready".';
  }
  return 'That status does not apply to this kind of order.';
}

/** Wording for the customer's "your order is now …" notification. */
export function customerStatusLabel(order: FlowOrder, status: string): string {
  const kind = fulfillmentKind(order);
  const courier = courierLabel(order.courier);
  switch (status) {
    case 'pending':
      return 'placed';
    case 'confirmed':
      return 'confirmed';
    case 'preparing':
      return 'being prepared';
    case 'ready':
      if (kind === 'courier_delivery')
        return `ready for courier pickup. Please book or send your ${courier} rider to the store`;
      if (kind === 'reservation') return 'ready for your reservation';
      return 'ready for pick-up';
    case 'on_the_way':
      return "out for delivery with our DonClaudio's rider";
    case 'completed':
      if (kind === 'store_delivery') return 'delivered';
      if (kind === 'courier_delivery') return `handed to your ${courier} rider`;
      if (kind === 'pickup') return 'picked up';
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return status;
  }
}

/**
 * Validates the customer's courier choice for a self-booked delivery.
 * Returns null when the order is not a self-booked delivery.
 */
export function parseCourier(raw: unknown): OrderCourier | null {
  if (!raw || typeof raw !== 'object') return null;
  const {provider, name} = raw as {provider?: unknown; name?: unknown};
  if (typeof provider !== 'string' || !(COURIER_PROVIDERS as readonly string[]).includes(provider)) {
    return null;
  }
  if (provider === 'other') {
    const trimmed = typeof name === 'string' ? name.trim().slice(0, 60) : '';
    return trimmed ? {provider: 'other', name: trimmed} : null;
  }
  return {provider: provider as CourierProvider};
}
