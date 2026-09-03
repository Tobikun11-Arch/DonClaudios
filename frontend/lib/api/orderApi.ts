import {httpClient} from './httpClient';

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
  };
  orderType: 'pickup' | 'delivery' | 'reservation';
  items: GuestOrderItemInput[];
  totalAmount: number;
  riderNotes?: string;
  paymentMethod?: 'cash' | 'card' | 'gcash' | 'other';
};

export type CreateCustomerOrderInput = {
  orderType: 'pickup' | 'delivery' | 'reservation';
  items: GuestOrderItemInput[];
  totalAmount: number;
  riderNotes?: string;
  paymentMethod?: 'cash' | 'card' | 'gcash' | 'other';
};

export type CreatedGuestOrderResponse = {
  order: {
    _id: string;
    orderStatus: string;
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
      };
  quantity: number;
  price: number;
  specialRequest?: string;
  name?: string;
  imageUrl?: string;
};

export type OrderHistoryEntry = {
  _id: string;
  orderType: 'pickup' | 'delivery' | 'reservation';
  totalAmount: number;
  riderNotes?: string;
  orderStatus: string;
  isGuest: boolean;
  guestInfo?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address?: string;
  };
  customerName?: string;
  items: OrderHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type ListOrdersResponse = {
  orders: OrderHistoryEntry[];
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

export async function listAllOrders() {
  const res = await httpClient.get<ListOrdersResponse>('/orders/all');
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
