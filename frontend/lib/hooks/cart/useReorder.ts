'use client';

import {useCallback, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';
import {addCartItem, getMyCart} from '@/lib/api/cartApi';
import {listProducts} from '@/lib/api/productsApi';
import {listPromos} from '@/lib/api/promosApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import type {OrderHistoryEntry, OrderHistoryItem} from '@/lib/api/orderApi';
import {customerCartQueryKey} from '@/lib/hooks/cart/useCustomerCart';
import {isPreOrderProduct, preOrderDisplay} from '@/lib/preOrder/preOrder';
import {useCartUiStore} from '@/app/store/cartUiStore';
import type {Product} from '@/lib/types/product';
import type {Promo} from '@/lib/types/promo';

/** Past orders that can be re-added to the cart: finished or cancelled, never dated pre-orders. */
export function canReorder(order: OrderHistoryEntry) {
  if (order.isPreOrder === true) return false;
  if (order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled') return false;
  return order.items.length > 0;
}

type Line = {id: string; name: string; quantity: number; instructions?: string};

function itemId(item: OrderHistoryItem) {
  return typeof item.productId === 'string' ? item.productId : item.productId?._id;
}

function itemName(item: OrderHistoryItem) {
  if (item.name) return item.name;
  if (item.productId && typeof item.productId === 'object') return item.productId.name ?? 'Item';
  return 'Item';
}

/** One line per product: the cart keeps a single row per product id. */
function collectLines(order: OrderHistoryEntry): Line[] {
  const byId = new Map<string, Line>();
  for (const item of order.items) {
    const id = itemId(item);
    if (!id || !(item.quantity > 0)) continue;
    const existing = byId.get(id);
    const instructions = item.specialRequest?.trim() || undefined;
    if (existing) {
      existing.quantity += item.quantity;
      if (instructions) existing.instructions = instructions;
    } else {
      byId.set(id, {id, name: itemName(item), quantity: item.quantity, instructions});
    }
  }
  return [...byId.values()];
}

function isBundleLive(promo: Promo, now = Date.now()) {
  if (promo.promoType !== 'bundle' || !promo.isActive) return false;
  if (typeof promo.price !== 'number' || promo.price <= 0) return false;
  const start = Date.parse(promo.startDate);
  const end = Date.parse(promo.endDate);
  if (!Number.isNaN(start) && now < start) return false;
  if (!Number.isNaN(end) && now > end) return false;
  return true;
}

type Skip = {name: string; reason: string};

/**
 * "Order again": puts a past order's foods back in the signed-in customer's
 * server cart at today's menu prices, skipping anything that can no longer be
 * ordered, then opens the cart on the menu tab.
 */
export function useReorder() {
  const router = useRouter();
  const qc = useQueryClient();
  const openCart = useCartUiStore(s => s.open);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const reorder = useCallback(
    async (order: OrderHistoryEntry) => {
      if (!canReorder(order) || pendingOrderId) return;
      setPendingOrderId(order._id);
      try {
        // Fresh menu, promos and cart: availability, stock and prices must be current.
        const [{products}, {promos}, {cart}] = await Promise.all([
          listProducts(),
          listPromos(),
          getMyCart()
        ]);
        const productById = new Map<string, Product>(products.map(p => [p._id, p]));
        const promoById = new Map<string, Promo>(promos.map(p => [p._id, p]));
        const inCart = new Map(cart.items.map(i => [String(i.productId), i.quantity]));

        const skipped: Skip[] = [];
        const notes: string[] = [];
        let added = 0;

        // Sequential on purpose: each add saves the same cart document.
        for (const line of collectLines(order)) {
          const product = productById.get(line.id);
          const promo = product ? undefined : promoById.get(line.id);

          let body: Parameters<typeof addCartItem>[0];
          if (product) {
            if (product.preOrderOnly === true) {
              skipped.push({name: product.name, reason: 'Holiday pre-order only'});
              continue;
            }
            if (!product.isAvailable) {
              skipped.push({name: product.name, reason: 'unavailable'});
              continue;
            }
            if (isPreOrderProduct(product) && preOrderDisplay(product).closed) {
              skipped.push({name: product.name, reason: 'pre-orders closed'});
              continue;
            }
            let quantity = line.quantity;
            if (!isPreOrderProduct(product)) {
              const room = product.stock - (inCart.get(line.id) ?? 0);
              if (room <= 0) {
                skipped.push({name: product.name, reason: 'out of stock'});
                continue;
              }
              if (room < quantity) {
                notes.push(`Only ${room} ${product.name} left, so we added ${room}.`);
                quantity = room;
              }
            }
            body = {
              productId: product._id,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
              quantity,
              instructions: line.instructions
            };
          } else if (promo && isBundleLive(promo)) {
            body = {
              productId: promo._id,
              name: promo.title,
              price: promo.price as number,
              imageUrl: promo.imageUrl,
              quantity: line.quantity,
              instructions: line.instructions
            };
          } else {
            skipped.push({name: promo?.title ?? line.name, reason: 'no longer on the menu'});
            continue;
          }

          try {
            await addCartItem(body);
            added += 1;
          } catch (err) {
            skipped.push({name: body.name, reason: getFriendlyErrorMessage(err, 'could not be added')});
          }
        }

        await qc.invalidateQueries({queryKey: customerCartQueryKey});

        const skippedText = skipped.map(s => `${s.name} (${s.reason})`).join(', ');
        if (added === 0) {
          toast.error('Nothing from this order can be added right now.', {
            description: skippedText || undefined
          });
          return;
        }

        toast.success(`Added ${added} item${added > 1 ? 's' : ''} to your cart at today's prices.`, {
          description: notes.length ? notes.join(' ') : undefined
        });
        if (skipped.length > 0) {
          toast.warning(`Skipped ${skipped.length} item${skipped.length > 1 ? 's' : ''}`, {
            description: skippedText,
            duration: 8000
          });
        }
        router.push('/customer/dashboard?tab=order');
        openCart();
      } catch (err) {
        toast.error(getFriendlyErrorMessage(err, 'Could not reorder. Please try again.'));
      } finally {
        setPendingOrderId(null);
      }
    },
    [openCart, pendingOrderId, qc, router]
  );

  return {reorder, pendingOrderId};
}
