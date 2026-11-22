'use client';

import {useCallback, useEffect, useRef} from 'react';
import {
  addCartItem,
  clearMyCart,
  getMyCart,
  removeCartItem,
  setCartItemQuantity,
  type ServerCart,
  type ServerCartItem
} from '@/lib/api/cartApi';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient
} from '@tanstack/react-query';
import {toast} from 'sonner';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';

export const customerCartQueryKey = ['cart', 'me'] as const;

/** Shared by every cart write, so we can tell when the last one finishes. */
const cartMutationKey = ['cart', 'write'] as const;

type CartQueryData = {cart: ServerCart};

/** How long +/- waits for more taps before saving the final quantity. */
const QUANTITY_SAVE_DELAY_MS = 300;

/**
 * Quantity saves that are waiting out the delay, by product id. Module level
 * so every cart view (drawer, checkout) sees the same pending saves.
 */
const pendingQuantitySaves = new Map<
  string,
  {timer: ReturnType<typeof setTimeout>; send: () => void}
>();

export function useCustomerCartQuery(enabled = true) {
  return useQuery({
    queryKey: customerCartQueryKey,
    queryFn: getMyCart,
    enabled,
    refetchOnWindowFocus: false
  });
}

/** Cart item ids may arrive populated ({_id}) from some responses. */
function isProduct(itemProductId: unknown, productId: string) {
  if (typeof itemProductId === 'string') return itemProductId === productId;
  if (itemProductId && typeof itemProductId === 'object' && '_id' in itemProductId) {
    return String((itemProductId as {_id: unknown})._id) === productId;
  }
  return false;
}

/** Changes the cached cart in place so the UI updates before the server replies. */
function patchCachedCart(
  qc: QueryClient,
  update: (items: ServerCartItem[]) => ServerCartItem[]
) {
  qc.setQueryData<CartQueryData>(customerCartQueryKey, old =>
    old?.cart ? {...old, cart: {...old.cart, items: update(old.cart.items)}} : old
  );
}

/** Stops an in-flight cart fetch from overwriting the optimistic change. */
async function beginOptimisticWrite(qc: QueryClient) {
  await qc.cancelQueries({queryKey: customerCartQueryKey});
}

/**
 * Applies the server's cart only when no other cart write is in flight or
 * waiting. Otherwise an older reply would undo a newer tap; the last write
 * to finish brings the cache in line with the server.
 */
function acceptServerCart(qc: QueryClient, data: CartQueryData) {
  // The finishing mutation still counts as pending inside its own callbacks.
  const othersInFlight = qc.isMutating({mutationKey: cartMutationKey}) > 1;
  if (othersInFlight || pendingQuantitySaves.size > 0) return;
  qc.setQueryData(customerCartQueryKey, data);
}

/** A write failed: our optimistic cache is wrong, so reload the real cart. */
function recoverFromFailedWrite(qc: QueryClient) {
  void qc.invalidateQueries({queryKey: customerCartQueryKey});
}

export function useAddCustomerCartItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: cartMutationKey,
    mutationFn: addCartItem,
    onMutate: async item => {
      await beginOptimisticWrite(qc);
      patchCachedCart(qc, items => {
        const existing = items.find(i => isProduct(i.productId, item.productId));
        if (existing) {
          return items.map(i =>
            isProduct(i.productId, item.productId)
              ? {
                  ...i,
                  quantity: i.quantity + item.quantity,
                  instructions: item.instructions ?? i.instructions
                }
              : i
          );
        }
        return [
          ...items,
          {
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
            instructions: item.instructions
          }
        ];
      });
    },
    onSuccess: data => acceptServerCart(qc, data),
    onError: () => recoverFromFailedWrite(qc)
  });
}

export function useSetCustomerCartItemQuantityMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: cartMutationKey,
    mutationFn: setCartItemQuantity,
    onMutate: async ({productId, quantity}) => {
      await beginOptimisticWrite(qc);
      patchCachedCart(qc, items =>
        items.map(i => (isProduct(i.productId, productId) ? {...i, quantity} : i))
      );
    },
    onSuccess: data => acceptServerCart(qc, data),
    onError: () => recoverFromFailedWrite(qc)
  });
}

/**
 * Returns a setter for +/- buttons. The number on screen changes at once;
 * quick taps on one item are combined into a single save of the final value.
 */
export function useCustomerCartQuantityUpdater() {
  const qc = useQueryClient();
  const {mutate} = useSetCustomerCartItemQuantityMutation();
  const mutateRef = useRef(mutate);
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  // Save anything still waiting when the view closes, so no tap is lost.
  useEffect(() => () => flushPendingQuantitySaves(), []);

  return useCallback(
    (productId: string, quantity: number) => {
      patchCachedCart(qc, items =>
        items.map(i => (isProduct(i.productId, productId) ? {...i, quantity} : i))
      );

      const pending = pendingQuantitySaves.get(productId);
      if (pending) clearTimeout(pending.timer);

      const send = () => {
        pendingQuantitySaves.delete(productId);
        mutateRef.current(
          {productId, quantity},
          {
            onError: err =>
              toast.error(
                getFriendlyErrorMessage(err, 'Could not update the quantity.')
              )
          }
        );
      };
      pendingQuantitySaves.set(productId, {
        timer: setTimeout(send, QUANTITY_SAVE_DELAY_MS),
        send
      });
    },
    [qc]
  );
}

/** Sends every quantity save that is still waiting out its delay. */
export function flushPendingQuantitySaves() {
  for (const {timer, send} of [...pendingQuantitySaves.values()]) {
    clearTimeout(timer);
    send();
  }
}

function dropPendingQuantitySave(productId: string) {
  const pending = pendingQuantitySaves.get(productId);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingQuantitySaves.delete(productId);
}

export function useRemoveCustomerCartItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: cartMutationKey,
    mutationFn: removeCartItem,
    onMutate: async productId => {
      // A quantity save for an item being removed would re-add nothing useful.
      dropPendingQuantitySave(productId);
      await beginOptimisticWrite(qc);
      patchCachedCart(qc, items => items.filter(i => !isProduct(i.productId, productId)));
    },
    onSuccess: data => acceptServerCart(qc, data),
    onError: () => recoverFromFailedWrite(qc)
  });
}

export function useClearCustomerCartMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: cartMutationKey,
    mutationFn: clearMyCart,
    onMutate: () => {
      for (const id of [...pendingQuantitySaves.keys()]) dropPendingQuantitySave(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({queryKey: customerCartQueryKey});
    }
  });
}
