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

export async function createGuestOrder(body: CreateGuestOrderInput) {
  const res = await httpClient.post<CreatedGuestOrderResponse>('/orders/guest', body);
  return res.data;
}
