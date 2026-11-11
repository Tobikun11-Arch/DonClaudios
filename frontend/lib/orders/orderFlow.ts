/**
 * Order status flow per kind of order — SINGLE place the UI reads it from.
 * Mirrors `backend/api/config/orderFlow.ts`, which enforces it. Keep in sync.
 *
 * The same status values are shared by every kind; what changes is which
 * steps apply and what they mean:
 *
 *   store_delivery   (free, DonClaudio's rider)  confirmed → preparing → on_the_way → completed
 *   courier_delivery (customer books a courier)  confirmed → preparing → ready      → completed
 *   pickup                                       confirmed → preparing → ready      → completed
 *   reservation                                  confirmed → preparing → ready      → completed
 *
 * For a customer-booked courier the store's job ends when it hands the food
 * to the rider, so there is no "on the way" step the store could track.
 */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'completed'
  | 'cancelled';

export type FulfillmentKind =
  | 'store_delivery'
  | 'courier_delivery'
  | 'pickup'
  | 'reservation';

export type CourierProvider = 'lalamove' | 'grab_express' | 'move_it' | 'other';

export const COURIER_OPTIONS: {value: CourierProvider; label: string}[] = [
  {value: 'lalamove', label: 'Lalamove'},
  {value: 'grab_express', label: 'Grab Express'},
  {value: 'move_it', label: 'Move It'},
  {value: 'other', label: 'Other'}
];

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

/** "Lalamove", "Grab Express", the customer's own courier name, or "your courier". */
export function courierLabel(courier?: OrderCourier | null): string {
  if (!courier) return 'Lalamove';
  if (courier.provider === 'other') return courier.name?.trim() || 'your courier';
  return COURIER_OPTIONS.find(o => o.value === courier.provider)?.label ?? 'your courier';
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

/** The status the staff button moves the order to next, or null when done. */
export function nextStatus(order: FlowOrder & {orderStatus: string}): OrderStatus | null {
  if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed') return null;
  const flow = statusFlow(order);
  const idx = flow.indexOf(order.orderStatus as OrderStatus);
  // An order left in a step that no longer belongs to its flow (e.g. an older
  // courier delivery marked "on the way") can still be finished.
  if (idx < 0) return 'completed';
  return idx >= flow.length - 1 ? null : flow[idx + 1];
}

/** Short label for staff (pills, buttons, filters). */
export function staffStatusLabel(order: FlowOrder | null, status: string): string {
  const kind = order ? fulfillmentKind(order) : null;
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'preparing':
      return 'Preparing';
    case 'ready':
      if (kind === 'courier_delivery') return 'Ready for courier';
      if (kind === 'reservation') return 'Ready for reservation';
      if (kind === 'pickup') return 'Ready for pick-up';
      return 'Ready';
    case 'on_the_way':
      return 'Out for delivery';
    case 'completed':
      if (kind === 'store_delivery') return 'Delivered';
      if (kind === 'courier_delivery') return 'Handed to courier';
      if (kind === 'pickup') return 'Picked up';
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

/** Step title + one-line explanation for the customer's tracking page. */
export function customerStep(
  order: FlowOrder,
  status: string
): {title: string; detail: string} {
  const kind = fulfillmentKind(order);
  const courier = courierLabel(order.courier);
  switch (status) {
    case 'pending':
      return {title: 'Order placed', detail: 'Waiting for the store to confirm your order.'};
    case 'confirmed':
      return {title: 'Order confirmed', detail: 'The store accepted your order.'};
    case 'preparing':
      return {title: 'Preparing your order', detail: 'Our kitchen is cooking your food.'};
    case 'ready':
      if (kind === 'courier_delivery')
        return {
          title: 'Ready for courier pickup',
          detail: `Your food is packed. Book or send your ${courier} rider to the store.`
        };
      if (kind === 'reservation')
        return {title: 'Ready for your reservation', detail: 'Your food is ready at the store.'};
      return {title: 'Ready for pick-up', detail: 'Come by the store to pick up your order.'};
    case 'on_the_way':
      return {
        title: 'Out for delivery',
        detail: kind === 'store_delivery'
          ? "Our DonClaudio's rider is on the way to you."
          : `Picked up by your ${courier} rider.`
      };
    case 'completed':
      if (kind === 'store_delivery') return {title: 'Delivered', detail: 'Enjoy your lechon!'};
      if (kind === 'courier_delivery')
        return {title: 'Handed to your courier', detail: `Your ${courier} rider has your order.`};
      if (kind === 'pickup') return {title: 'Picked up', detail: 'Thanks for ordering!'};
      return {title: 'Completed', detail: 'Thanks for dining with us!'};
    case 'cancelled':
      return {title: 'Cancelled', detail: 'This order was cancelled.'};
    default:
      return {title: status, detail: ''};
  }
}

/** "Free delivery by DonClaudio's", "Delivery · Grab Express (you book)", "Pick-up", "Reservation". */
export function fulfillmentLabel(order: FlowOrder): string {
  switch (fulfillmentKind(order)) {
    case 'store_delivery':
      return "Free delivery by DonClaudio's";
    case 'courier_delivery':
      return `Delivery · ${courierLabel(order.courier)} (customer-booked)`;
    case 'reservation':
      return 'Reservation';
    default:
      return 'Pick-up';
  }
}
