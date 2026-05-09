import {httpClient} from './httpClient';

export type ServerCartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

export type ServerCart = {
  _id: string;
  customerId: string;
  items: ServerCartItem[];
  updatedAt: string;
  createdAt: string;
};

export async function getMyCart() {
  const res = await httpClient.get<{cart: ServerCart}>('/cart/me');
  return res.data;
}

export async function addCartItem(body: {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}) {
  const res = await httpClient.post<{cart: ServerCart}>('/cart/items', body);
  return res.data;
}

export async function setCartItemQuantity(params: {
  productId: string;
  quantity: number;
}) {
  const res = await httpClient.patch<{cart: ServerCart}>(
    `/cart/items/${encodeURIComponent(params.productId)}`,
    {quantity: params.quantity}
  );
  return res.data;
}

export async function removeCartItem(productId: string) {
  const res = await httpClient.delete<{cart: ServerCart}>(
    `/cart/items/${encodeURIComponent(productId)}`
  );
  return res.data;
}

export async function clearMyCart() {
  const res = await httpClient.delete<{cart: ServerCart}>('/cart/me');
  return res.data;
}
