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
  items: OrderHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type ListOrdersResponse = {
  orders: OrderHistoryEntry[];
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
