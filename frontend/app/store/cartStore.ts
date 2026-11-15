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

/** A guest cart is cleared after this long with no activity. */
export const GUEST_CART_TTL_MS = 60 * 60 * 1000;

type CartStore = {
  items: CartItem[];
  /** Last cart change or site visit (ms). Null for an empty or legacy cart. */
  lastActiveAt: number | null;
  /** Marks the guest as active, keeping the cart alive. */
  touch: () => void;
  /** Clears the cart if it has been idle longer than the TTL. True if it was cleared. */
  expireIfIdle: (now?: number) => boolean;
  addItem: (item: Omit<CartItem, 'qty'> & {qty?: number}) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      lastActiveAt: null,
      touch: () => {
        if (get().items.length > 0) set({lastActiveAt: Date.now()});
      },
      expireIfIdle: (now = Date.now()) => {
        const {items, lastActiveAt} = get();
        if (items.length === 0) return false;
        // Carts saved before this rule have no timestamp: start the clock now.
        if (lastActiveAt == null) {
          set({lastActiveAt: now});
          return false;
        }
        if (now - lastActiveAt <= GUEST_CART_TTL_MS) return false;
        set({items: [], lastActiveAt: null});
        return true;
      },
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
            ),
            lastActiveAt: Date.now()
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
          ],
          lastActiveAt: Date.now()
        });
      },
      removeItem: productId =>
        set({
          items: get().items.filter(i => i.productId !== productId),
          lastActiveAt: Date.now()
        }),
      setQty: (productId, qty) => {
        const safeQty = Math.max(1, qty);
        set({
          items: get().items.map(i =>
            i.productId === productId ? {...i, qty: safeQty} : i
          ),
          lastActiveAt: Date.now()
        });
      },
      clear: () => set({items: [], lastActiveAt: null})
    }),
    {
      name: 'donclaudios_cart',
      partialize: state => ({items: state.items, lastActiveAt: state.lastActiveAt})
    }
  )
);

export function getCartUniqueCount(items: {productId: string}[]) {
  return items.length;
}

export function getCartSubtotal(items: {price: number; qty: number}[]) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}
