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
    phoneNumber?: string;
    email?: string;
    address?: string;
  };
  orderType: 'pickup' | 'delivery' | 'reservation';
  items: GuestOrderItemInput[];
  totalAmount: number;
  riderNotes?: string;
  /** Courier the guest will book (deliveries are always self-booked for guests). */
  courier?: {provider: 'lalamove' | 'grab_express' | 'move_it' | 'other'; name?: string};
  /** Anti-spam honeypot: hidden field, must stay empty. */
  website?: string;
  /** Anti-spam: epoch ms when the checkout form was opened. */
  formStartedAt?: number;
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
  /** Pinned drop-off; the server uses it to check the free-delivery zone. */
  deliveryLocation?: {lat: number; lng: number};
  /** Courier the customer will book when delivery is not free. */
  courier?: {provider: 'lalamove' | 'grab_express' | 'move_it' | 'other'; name?: string};
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
  /** Holiday pre-order size, e.g. "4-5 KG". */
  sizeLabel?: string | null;
  preOrderSizeId?: string | null;
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

export type OrderPreOrderInfo = {
  eventId: string;
  eventTitle: string;
  pickupDate: string;
  slotId: string;
  slotLabel: string;
  pickupAt: string;
  receiveMethod: 'pickup' | 'lalamove';
  /** Customers can cancel until this instant. */
  cancelDeadline: string;
};

export type OrderHistoryEntry = {
  _id: string;
  orderType: 'pickup' | 'delivery' | 'reservation';
  totalAmount: number;
  deliveryFee?: number;
  sizeKg?: number | null;
  occasionId?: string | null;
  deliveryMode?: 'DONCLAUDIO' | 'LALAMOVE';
  courier?: {provider: 'lalamove' | 'grab_express' | 'move_it' | 'other'; name?: string | null} | null;
  deliveryLocation?: {lat: number; lng: number} | null;
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
  /** Payment summary ('unpaid' | 'down_payment' | 'paid'). */
  paymentStatus?: 'unpaid' | 'down_payment' | 'paid' | null;
  /** How the customer chose to pay after the cashier confirmed. */
  paymentChoice?: PaymentChoice | null;
  /** How the balance is settled after a down payment. */
  balanceChoice?: 'cash' | 'online' | null;
  /** Order amount settled so far (excludes transaction fees). */
  amountPaid?: number;
  /** Xendit fees the customer paid on top of the order. */
  transactionFee?: number;
  paymentChannel?: PaymentChannel | null;
  /** When the open Xendit invoice expires. */
  paymentExpiresAt?: string | null;
  refundStatus?: 'none' | 'pending' | 'refunded' | 'failed';
  /** Dated Holiday Pre-order (see `preOrder`). */
  isPreOrder?: boolean;
  preOrder?: OrderPreOrderInfo | null;
  /** Set on server docs; missing in some cached local entries. */
  orderSource?: 'online' | 'in-store' | null;
  /** Walk-in order number, e.g. "DC-001". */
  orderNumber?: string | null;
  paidAt?: string | null;
  paidBy?: string | null;
  guestInfo?: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
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
  /** `queue`: active orders + the last 7 days only (when no date range). */
  scope?: 'queue';
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
    phoneNumber?: string;
    email?: string;
    address?: string;
  };
  customerId?: string | null;
  createdAt: string;
  lastMessageAt: string;
  lastMessage: string;
  lastSender: string;
  /** Who wrote last: 'customer' means the store still has to reply. */
  lastAuthorType?: 'customer' | 'admin';
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

export async function listOrderMessages(orderId: string, asGuest = false) {
  const res = await httpClient.get<ListOrderMessagesResponse>(
    asGuest ? `/orders/${orderId}/messages/guest` : `/orders/${orderId}/messages`
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

export type ListCounterOrdersParams = {
  status?: string;
  preset?: ReportPreset | 'custom';
  from?: string;
  to?: string;
};

export async function listCounterOrders(params?: ListCounterOrdersParams) {
  const res = await httpClient.get<{orders: CounterOrderEntry[]}>(
    '/orders/counter',
    {params}
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

export async function sendOrderMessage(orderId: string, body: string, asGuest = false) {
  const res = await httpClient.post<{message: OrderMessage}>(
    asGuest ? `/orders/${orderId}/messages/guest` : `/orders/${orderId}/messages`,
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

export async function sendGuestEmailOtp(email: string) {
  const res = await httpClient.post<{message: string; alreadyVerified?: boolean}>(
    '/orders/guest/otp/email',
    {email}
  );
  return res.data;
}

export async function verifyGuestEmailOtp(email: string, code: string) {
  const res = await httpClient.post<{message: string}>(
    '/orders/guest/otp/email/verify',
    {email, code}
  );
  return res.data;
}

export async function getGuestEmailOtpStatus(email: string) {
  const res = await httpClient.get<{verified: boolean; message: string}>(
    '/orders/guest/otp/email/status',
    {params: {email}}
  );
  return res.data;
}

export async function getTrackedOrder(
  orderId: string,
  phoneNumber?: string,
  email?: string
) {
  const params: Record<string, string> = {};
  if (phoneNumber) params.phoneNumber = phoneNumber;
  if (email) params.email = email;
  const res = await httpClient.get<OrderDetailResponse>(
    `/orders/customer/track/${orderId}`,
    {params: Object.keys(params).length ? params : undefined}
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
/* XENDIT PAYMENT flow                                                 */
/* ------------------------------------------------------------------ */

export type PaymentChannel = 'gcash' | 'maya' | 'grabpay' | 'shopeepay' | 'card';
export type PaymentChoice = 'online_full' | 'online_down_payment' | 'cash_on_pickup';
export type PaymentKind = 'full' | 'down_payment' | 'balance';

export const PAYMENT_CHANNEL_LABELS: Record<PaymentChannel, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  grabpay: 'GrabPay',
  shopeepay: 'ShopeePay',
  card: 'Credit/Debit card'
};

export type PaymentQuote = {amount: number; transactionFee: number; charge: number};
export type QuoteMap = Record<PaymentChannel, PaymentQuote>;

export type PaymentRecord = {
  id: string;
  kind: PaymentKind;
  channel: PaymentChannel;
  amount: number;
  transactionFee: number;
  charge: number;
  status:
    | 'PENDING'
    | 'PAID'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'REFUND_PENDING'
    | 'REFUNDED'
    | 'REFUND_FAILED';
  paidAt: string | null;
  createdAt: string;
};

export type PaymentSummary = {
  configured: boolean;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  transactionFee: number;
  paymentStatus: 'unpaid' | 'down_payment' | 'paid';
  paymentChoice: PaymentChoice | null;
  balanceChoice: 'cash' | 'online' | null;
  paymentChannel: PaymentChannel | null;
  refundStatus: 'none' | 'pending' | 'refunded' | 'failed';
  /** Whole order in cash on pickup (never for pre-orders). */
  cashAllowed: boolean;
  /** Balance after a down payment may be paid in cash (self pick-up only). */
  balanceCashAllowed?: boolean;
  isPreOrder?: boolean;
  pickup?: {date: string; slotLabel: string; receiveMethod: 'pickup' | 'lalamove'} | null;
  downPaymentAllowed: boolean;
  downPaymentAmount: number;
  channels: Array<{id: PaymentChannel; label: string}>;
  quotes: {
    full: QuoteMap;
    down_payment: QuoteMap | null;
    balance: QuoteMap | null;
  };
  pendingPayment: {
    kind: PaymentKind;
    channel: PaymentChannel;
    amount: number;
    transactionFee: number;
    charge: number;
    invoiceUrl: string;
    expiresAt: string;
  } | null;
  payments: PaymentRecord[];
};

const guestParams = (phoneNumber?: string) =>
  phoneNumber ? {phoneNumber} : undefined;

export async function fetchPaymentSummary(orderId: string, phoneNumber?: string) {
  const res = await httpClient.get<{payment: PaymentSummary}>(
    `/orders/${orderId}/payment`,
    {params: guestParams(phoneNumber)}
  );
  return res.data.payment;
}

export type CheckoutResponse = PaymentQuote & {
  invoiceUrl: string;
  expiresAt: string;
};

/** Creates a Xendit invoice; redirect the browser to `invoiceUrl`. */
export async function startPaymentCheckout(
  orderId: string,
  input: {kind: 'full' | 'down_payment'; channel: PaymentChannel},
  phoneNumber?: string
) {
  const res = await httpClient.post<CheckoutResponse>(
    `/orders/${orderId}/payment/checkout`,
    input,
    {params: guestParams(phoneNumber)}
  );
  return res.data;
}

/** After a down payment: pay the balance online (returns invoiceUrl) or in cash. */
export async function payOrderBalance(
  orderId: string,
  input: {method: 'online'; channel: PaymentChannel} | {method: 'cash'},
  phoneNumber?: string
) {
  const res = await httpClient.post<CheckoutResponse | OrderDetailResponse>(
    `/orders/${orderId}/payment/balance`,
    input,
    {params: guestParams(phoneNumber)}
  );
  return res.data;
}

export async function submitCashPayment(
  orderId: string,
  phoneNumber?: string
) {
  const res = await httpClient.post<OrderDetailResponse>(
    `/orders/${orderId}/payment/cash`,
    {},
    {params: phoneNumber ? {phoneNumber} : undefined}
  );
  return res.data;
}

export async function markOnlineOrderPaid(orderId: string) {
  const res = await httpClient.patch<OrderDetailResponse>(
    `/orders/${orderId}/payment/mark-paid`,
    {}
  );
  return res.data;
}
