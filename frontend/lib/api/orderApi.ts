import {httpClient} from './httpClient';
import type {ReportPreset} from '@/lib/types/report';

export type GuestOrderItemInput = {
  productId: string;
  quantity: number;
  price: number;
  specialRequest?: string;
};

export type CreateGuestOrderInput = {
  guestInfo: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address?: string;
    email?: string;
  };
  orderType: 'pickup' | 'delivery' | 'reservation';
  items: GuestOrderItemInput[];
  totalAmount: number;
  riderNotes?: string;
};

export type CreateCustomerOrderInput = {
  orderType: 'pickup' | 'delivery' | 'reservation';
  items: GuestOrderItemInput[];
  totalAmount: number;
  riderNotes?: string;
  contactInfo?: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    address?: string;
  };
};

export type CreatedGuestOrderResponse = {
  order: {
    _id: string;
    orderStatus: string;
    orderNumber?: string;
  };
  transaction: {
    _id: string;
    paymentMethod: string;
  };
};

export type OrderHistoryItem = {
  _id?: string;
  productId:
    | string
    | {
        _id: string;
        name?: string;
        imageUrl?: string;
        category?: string;
        isPreOrder?: boolean;
      };
  quantity: number;
  price: number;
  prepTimeMinutes?: number | null;
  specialRequest?: string;
  name?: string;
  imageUrl?: string;
};

/** Server-computed, request-time view of how the order is tracking. */
export type OrderPrepTiming = {
  preparingAt: string | null;
  dueAt: string | null;
  estimatedPrepMinutes: number | null;
  isOverdue: boolean;
  /** Positive = minutes left. Negative = minutes past due. */
  minutesRemaining: number | null;
  isRunning: boolean;
};

export type OrderHistoryEntry = {
  _id: string;
  orderType: 'pickup' | 'delivery' | 'reservation';
  totalAmount: number;
  deliveryFee?: number;
  paymentMethod?: string | null;
  riderNotes?: string;
  orderStatus: string;
  isGuest: boolean;
  changeFor?: string;
  cancelReason?: string;
  estimatedPrepMinutes?: number | null;
  estimatedReadyAt?: string | null;
  statusHistory?: Array<{status: string; at: string}>;
  prepTiming?: OrderPrepTiming;
  /** Manual-payment claim ('unpaid' | 'down_payment' | 'paid'). */
  paymentStatus?: 'unpaid' | 'down_payment' | 'paid' | null;
  /** Cashier has confirmed the customer's claim. */
  paymentVerified?: boolean;
  paymentProofUrl?: string | null;
  paymentNote?: string | null;
  /** Set on server docs; missing in some cached local entries. */
  orderSource?: 'online' | 'in-store' | null;
  /** Walk-in order number, e.g. "DC-001". */
  orderNumber?: string | null;
  paidAt?: string | null;
  paidBy?: string | null;
  guestInfo?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address?: string;
    email?: string;
  };
  customerName?: string;
  items: OrderHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type ListOrdersResponse = {
  orders: OrderHistoryEntry[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  revenue?: number;
  counts?: {
    status: Record<string, number>;
    type: Record<string, number>;
  };
};

export type ListAllOrdersParams = {
  status?: string;
  type?: 'pickup' | 'delivery' | 'reservation';
  page?: number;
  limit?: number;
  preset?: ReportPreset | 'custom';
  from?: string;
  to?: string;
  withCounts?: boolean;
};

export type OrderDetailResponse = {
  order: OrderHistoryEntry;
};

export type OrderMessage = {
  _id: string;
  orderId: string;
  authorType: 'customer' | 'admin';
  senderName: string;
  body: string;
  createdAt: string;
};

export type FollowUpOrder = {
  orderId: string;
  orderType: 'pickup' | 'delivery' | 'reservation';
  totalAmount: number;
  orderStatus: string;
  isGuest: boolean;
  guestInfo?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address?: string;
    email?: string;
  };
  customerId?: string | null;
  createdAt: string;
  lastMessageAt: string;
  lastMessage: string;
  lastSender: string;
  messageCount: number;
};

export type ListOrderMessagesResponse = {
  messages: OrderMessage[];
};

export async function createGuestOrder(body: CreateGuestOrderInput) {
  const res = await httpClient.post<CreatedGuestOrderResponse>(
    '/orders/guest',
    body
  );
  return res.data;
}

export async function createCustomerOrder(body: CreateCustomerOrderInput) {
  const res = await httpClient.post<CreatedGuestOrderResponse>(
    '/orders/me',
    body
  );
  return res.data;
}

export async function listMyOrders() {
  const res = await httpClient.get<ListOrdersResponse>('/orders/me');
  return res.data;
}

export async function listAllOrders(params?: ListAllOrdersParams) {
  const res = await httpClient.get<ListOrdersResponse>('/orders/all', {params});
  return res.data;
}

export async function getOrderById(orderId: string) {
  const res = await httpClient.get<OrderDetailResponse>(`/orders/${orderId}`);
  return res.data;
}

export async function updateOrderStatus(orderId: string, status: string) {
  const res = await httpClient.patch<{order: OrderHistoryEntry}>(
    `/orders/${orderId}/status`,
    {status}
  );
  return res.data;
}

export async function listOrderMessages(orderId: string) {
  const res = await httpClient.get<ListOrderMessagesResponse>(
    `/orders/${orderId}/messages`
  );
  return res.data;
}

export async function listAdminOrderMessages(orderId: string) {
  const res = await httpClient.get<ListOrderMessagesResponse>(
    `/orders/${orderId}/messages/admin`
  );
  return res.data;
}

export async function listFollowUpOrders() {
  const res = await httpClient.get<{orders: FollowUpOrder[]}>('/orders/follow-up');
  return res.data;
}

export type CreateCounterOrderInput = {
  customerInfo?: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
  };
  items: GuestOrderItemInput[];
  totalAmount: number;
  paymentMethod?: 'cash' | 'card' | 'gcash' | 'other';
};

export type CounterOrderEntry = OrderHistoryEntry & {
  paymentMethod?: 'cash' | 'card' | 'gcash' | 'other';
  orderSource?: 'online' | 'in-store';
};

export async function createCounterOrder(body: CreateCounterOrderInput) {
  const res = await httpClient.post<CreatedGuestOrderResponse>(
    '/orders/counter',
    body
  );
  return res.data;
}

export async function listCounterOrders() {
  const res = await httpClient.get<{orders: CounterOrderEntry[]}>(
    '/orders/counter'
  );
  return res.data;
}

export async function voidCounterOrder(orderId: string) {
  const res = await httpClient.post<{order: CounterOrderEntry}>(
    `/orders/counter/${orderId}/void`
  );
  return res.data;
}

export async function markCounterOrderPaid(
  orderId: string,
  paymentMethod: 'cash' | 'card' | 'gcash' | 'other'
) {
  const res = await httpClient.patch<{order: CounterOrderEntry; transaction?: unknown}>(
    `/orders/counter/${orderId}/mark-paid`,
    {paymentMethod}
  );
  return res.data;
}

export async function updateCounterOrder(
  orderId: string,
  body: CreateCounterOrderInput
) {
  const res = await httpClient.patch<{order: CounterOrderEntry; transaction?: unknown}>(
    `/orders/counter/${orderId}`,
    body
  );
  return res.data;
}

export async function sendOrderMessage(orderId: string, body: string) {
  const res = await httpClient.post<{message: OrderMessage}>(
    `/orders/${orderId}/messages`,
    {body}
  );
  return res.data;
}

export async function sendAdminOrderMessage(orderId: string, body: string) {
  const res = await httpClient.post<{message: OrderMessage}>(
    `/orders/${orderId}/messages/admin`,
    {body}
  );
  return res.data;
}

export async function getTrackedOrder(orderId: string, phoneNumber?: string) {
  const res = await httpClient.get<OrderDetailResponse>(
    `/orders/customer/track/${orderId}`,
    {params: phoneNumber ? {phoneNumber} : undefined}
  );
  return res.data;
}

export async function cancelTrackedOrder(
  orderId: string,
  reason: string,
  phoneNumber?: string
) {
  const res = await httpClient.post<OrderDetailResponse>(
    `/orders/customer/track/${orderId}/cancel`,
    {reason},
    {params: phoneNumber ? {phoneNumber} : undefined}
  );
  return res.data;
}

export type GuestOtpStatusResponse = {
  verified: boolean;
  message: string;
};

export async function sendGuestOtp(phoneNumber: string) {
  const res = await httpClient.post<{message: string; alreadyVerified?: boolean}>(
    '/orders/guest/otp',
    {phoneNumber}
  );
  return res.data;
}

export async function verifyGuestOtp(phoneNumber: string, code: string) {
  const res = await httpClient.post<{message: string}>(
    '/orders/guest/otp/verify',
    {phoneNumber, code}
  );
  return res.data;
}

export async function getGuestOtpStatus(phoneNumber: string) {
  const res = await httpClient.get<GuestOtpStatusResponse>(
    '/orders/guest/otp/status',
    {params: {phoneNumber}}
  );
  return res.data;
}

/* ------------------------------------------------------------------ */
/* MANUAL PAYMENT flow                                                 */
/* ------------------------------------------------------------------ */

/**
 * Channels a customer can pick when submitting proof of payment. Cash is
 * never one of them — cash lives at the counter (POS) only.
 */
export type OnlinePaymentMethod = 'gcash' | 'maya' | 'bdo' | 'bpi' | 'psbank';

export const ONLINE_PAYMENT_LABELS: Record<OnlinePaymentMethod, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  bdo: 'BDO Transfer',
  bpi: 'BPI Transfer',
  psbank: 'PSBank Transfer'
};

export type SubmitPaymentInput = {
  /** What the customer paid: the agreed partial, or the full amount. */
  status: 'down_payment' | 'paid';
  paymentMethod: OnlinePaymentMethod;
  note?: string;
  /** Screenshot of the payment receipt. */
  proof: File;
  /** Guests authenticate with the order's phone number. */
  phoneNumber?: string;
};

export type SubmitPaymentResponse = OrderDetailResponse;

export async function submitOrderPayment(
  orderId: string,
  input: SubmitPaymentInput
) {
  const data = new FormData();
  data.append('status', input.status);
  data.append('paymentMethod', input.paymentMethod);
  if (input.note && input.note.trim().length > 0) {
    data.append('note', input.note.trim());
  }
  data.append('proof', input.proof);

  const res = await httpClient.post<SubmitPaymentResponse>(
    `/orders/${orderId}/payment`,
    data,
    {
      params: input.phoneNumber ? {phoneNumber: input.phoneNumber} : undefined,
      headers: {'Content-Type': 'multipart/form-data'}
    }
  );
  return res.data;
}

export async function verifyOrderPayment(orderId: string, verified: boolean) {
  const res = await httpClient.patch<OrderDetailResponse>(
    `/orders/${orderId}/payment/verify`,
    {verified}
  );
  return res.data;
}
