import {httpClient} from './httpClient';

/* Dated "Holiday" pre-orders (see backend preOrderEvent.service). */

export type PreOrderStatus = 'draft' | 'published' | 'closed';

export type PreOrderSize = {
  _id: string;
  label: string;
  description: string | null;
  price: number;
  maxPerOrder: number;
  remaining: number;
  soldOut: boolean;
  /** Owner only. */
  stock?: number;
  sold?: number;
};

export type PreOrderProduct = {
  _id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  category: string | null;
  description: string | null;
  /** How many different sizes of this product one customer may choose. */
  maxSizes: number;
  sizes: PreOrderSize[];
};

export type PreOrderSlot = {
  _id: string;
  label: string;
  startTime: string;
  remaining: number;
  full: boolean;
  /** Owner only. */
  limit?: number;
  booked?: number;
};

export type PreOrderEvent = {
  _id: string;
  title: string;
  /** YYYY-MM-DD (Manila). */
  pickupDate: string;
  pickupDateLabel: string;
  status: PreOrderStatus;
  description: string | null;
  cancelCutoffDays: number;
  /** Active pre-orders one customer may have for this date. */
  maxOrdersPerCustomer: number;
  cancelDeadline: string;
  fromPrice: number | null;
  soldOut: boolean;
  products: PreOrderProduct[];
  slots: PreOrderSlot[];
  /** Signed-in customer only: their active orders and pieces per size. */
  mine?: {orderIds: string[]; sizeQty: Record<string, number>} | null;
  /** Owner list only. */
  orderCount?: number;
  orderValue?: number;
  publishedAt?: string | null;
};

export type PreOrderEventInput = {
  title: string;
  pickupDate: string;
  description?: string | null;
  cancelCutoffDays: number;
  maxOrdersPerCustomer: number;
  products: Array<{
    _id?: string;
    productId: string;
    maxSizes: number;
    sizes: Array<{
      _id?: string;
      label: string;
      description?: string | null;
      price: number;
      stock: number;
      maxPerOrder: number;
    }>;
  }>;
  slots: Array<{_id?: string; label: string; startTime: string; limit: number}>;
};

export type PreOrderOwnerOrder = {
  _id: string;
  code: string;
  customerName: string;
  customerPhone: string | null;
  slotLabel: string;
  receiveMethod: 'pickup' | 'lalamove';
  orderStatus: string;
  paymentStatus: 'unpaid' | 'down_payment' | 'paid';
  amountPaid: number;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  items: Array<{name: string; sizeLabel: string | null; quantity: number; price: number}>;
};

export type PlacePreOrderInput = {
  items: Array<{productId: string; sizeId: string; quantity: number}>;
  slotId: string;
  receiveMethod: 'pickup' | 'lalamove';
  notes?: string;
};

// ----- owner -----
export async function listPreOrderEvents() {
  const res = await httpClient.get<{events: PreOrderEvent[]}>('/preorders/events');
  return res.data.events;
}
export async function getPreOrderEvent(id: string) {
  const res = await httpClient.get<{event: PreOrderEvent}>(`/preorders/events/${id}`);
  return res.data.event;
}
export async function createPreOrderEvent(input: PreOrderEventInput) {
  const res = await httpClient.post<{event: PreOrderEvent}>('/preorders/events', input);
  return res.data.event;
}
export async function updatePreOrderEvent(id: string, input: PreOrderEventInput) {
  const res = await httpClient.put<{event: PreOrderEvent}>(`/preorders/events/${id}`, input);
  return res.data.event;
}
export async function setPreOrderEventStatus(id: string, status: PreOrderStatus) {
  const res = await httpClient.patch<{event: PreOrderEvent}>(`/preorders/events/${id}/status`, {status});
  return res.data.event;
}
export async function duplicatePreOrderEvent(id: string, input: {title: string; pickupDate: string}) {
  const res = await httpClient.post<{event: PreOrderEvent}>(`/preorders/events/${id}/duplicate`, input);
  return res.data.event;
}
export async function deletePreOrderEvent(id: string) {
  await httpClient.delete(`/preorders/events/${id}`);
}
export async function listPreOrderEventOrders(id: string) {
  const res = await httpClient.get<{orders: PreOrderOwnerOrder[]}>(`/preorders/events/${id}/orders`);
  return res.data.orders;
}

// ----- customers / public -----
export async function listOpenPreOrders() {
  const res = await httpClient.get<{events: PreOrderEvent[]}>('/preorders/open');
  return res.data.events;
}
export async function getOpenPreOrder(id: string) {
  const res = await httpClient.get<{event: PreOrderEvent}>(`/preorders/open/${id}`);
  return res.data.event;
}
export async function placePreOrder(id: string, input: PlacePreOrderInput) {
  const res = await httpClient.post<{order: {_id: string}}>(`/preorders/open/${id}/orders`, input);
  return res.data.order;
}
