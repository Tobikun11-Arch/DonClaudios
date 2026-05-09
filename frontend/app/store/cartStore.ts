import {create} from 'zustand';
import {persist} from 'zustand/middleware';

type CartItem = {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  qty: number;
  instructions?: string;
};

type CartStore = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'> & {qty?: number}) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: item => {
        const qtyToAdd = item.qty ?? 1;
        if (qtyToAdd <= 0) return;

        const existing = get().items.find(i => i.productId === item.productId);
        if (existing) {
          set({
            items: get().items.map(i =>
              i.productId === item.productId
                ? {...i, qty: i.qty + qtyToAdd, instructions: item.instructions}
                : i
            )
          });
          return;
        }

        set({
          items: [
            ...get().items,
            {
              productId: item.productId,
              name: item.name,
              price: item.price,
              imageUrl: item.imageUrl,
              qty: qtyToAdd,
              instructions: item.instructions
            }
          ]
        });
      },
      removeItem: productId =>
        set({items: get().items.filter(i => i.productId !== productId)}),
      setQty: (productId, qty) => {
        const safeQty = Math.max(1, qty);
        set({
          items: get().items.map(i =>
            i.productId === productId ? {...i, qty: safeQty} : i
          )
        });
      },
      clear: () => set({items: []})
    }),
    {
      name: 'donclaudios_cart'
    }
  )
);

export function getCartUniqueCount(items: {productId: string}[]) {
  return items.length;
}

export function getCartSubtotal(items: {price: number; qty: number}[]) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}
