'use client';

import {useMemo} from 'react';
import Image from 'next/image';
import {X, Minus, Plus, ChevronDown} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useCartUiStore} from '@/app/store/cartUiStore';
import {
  useCustomerCartQuery,
  useRemoveCustomerCartItemMutation,
  useSetCustomerCartItemQuantityMutation
} from '@/lib/hooks/cart/useCustomerCart';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {getDiscountedUnitPrice} from '@/lib/utils/promoPricing';

type CustomerCartDrawerProps = {
  deliveryFee?: number;
};

export default function CustomerCartDrawer({
  deliveryFee: _deliveryFee = 49
}: CustomerCartDrawerProps) {
  const isOpen = useCartUiStore(s => s.isOpen);
  const close = useCartUiStore(s => s.close);

  const promosQuery = usePublicPromosQuery();
  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data?.promos]
  );

  const cartQuery = useCustomerCartQuery(isOpen);

  const setQtyMutation = useSetCustomerCartItemQuantityMutation();
  const removeItemMutation = useRemoveCustomerCartItemMutation();

  const items = useMemo(
    () => cartQuery.data?.cart?.items ?? [],
    [cartQuery.data]
  );

  const subtotal = useMemo(() => {
    if (promos.length === 0) {
      return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }

    return items.reduce((sum, i) => {
      const {unitPrice} = getDiscountedUnitPrice({
        promos,
        productId: i.productId,
        basePrice: i.price
      });
      return sum + unitPrice * i.quantity;
    }, 0);
  }, [items, promos]);

  const effectiveDeliveryFee = items.length > 0 ? 0 * _deliveryFee : 0;
  const total = subtotal + effectiveDeliveryFee;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-80">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={close}
        aria-label="Close cart"
      />

      <div
        className={
          'absolute bg-white shadow-2xl flex flex-col ' +
          'w-full md:w-105 ' +
          'bottom-0 md:bottom-auto md:top-0 md:right-0 ' +
          'h-[85dvh] md:h-dvh ' +
          'rounded-t-3xl md:rounded-none'
        }
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900">
              My Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
            </p>
            <button
              type="button"
              className="mt-0.5 w-full inline-flex items-center justify-between gap-2 text-left text-xs font-semibold text-[#c30010]"
            >
              <span className="min-w-0 truncate">Delivery</span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </button>
          </div>

          <Button
            type="button"
            onClick={close}
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cartQuery.isLoading && (
            <div className="text-sm text-gray-500 py-10 text-center">
              Loading cart...
            </div>
          )}

          {cartQuery.isError && (
            <div className="text-sm text-gray-500 py-10 text-center">
              Failed to load cart.
            </div>
          )}

          {!cartQuery.isLoading && !cartQuery.isError && items.length === 0 && (
            <div className="text-sm text-gray-500 py-10 text-center">
              Your cart is empty.
            </div>
          )}

          {!cartQuery.isLoading && !cartQuery.isError && items.length > 0 && (
            <div className="space-y-4">
              {items.map(item => (
                <div
                  key={item.productId}
                  className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                    <Image
                      src={
                        item.imageUrl && item.imageUrl.length > 0
                          ? item.imageUrl
                          : '/assets/sample_menu.png'
                      }
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                          {item.name}
                        </p>
                        <button
                          type="button"
                          className="mt-1 text-xs font-semibold text-[#c30010]"
                          onClick={() =>
                            removeItemMutation.mutate(item.productId)
                          }
                          disabled={removeItemMutation.isPending}
                        >
                          Remove
                        </button>
                      </div>

                      {(() => {
                        const {unitPrice} = getDiscountedUnitPrice({
                          promos,
                          productId: item.productId,
                          basePrice: item.price
                        });

                        const isDiscounted = unitPrice < item.price;

                        return (
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-gray-900">
                              ₱{unitPrice}.00
                            </p>
                            {isDiscounted ? (
                              <p className="text-[11px] text-gray-400 line-through">
                                ₱{item.price}.00
                              </p>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      <div className="inline-flex items-center rounded-full border border-gray-200 overflow-hidden">
                        <button
                          type="button"
                          className="h-8 w-10 inline-flex items-center justify-center hover:bg-gray-50"
                          onClick={() =>
                            setQtyMutation.mutate({
                              productId: item.productId,
                              quantity: Math.max(1, item.quantity - 1)
                            })
                          }
                          aria-label="Decrease"
                          disabled={setQtyMutation.isPending}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <div className="min-w-10 text-center text-sm font-semibold text-gray-900">
                          {item.quantity}
                        </div>
                        <button
                          type="button"
                          className="h-8 w-10 inline-flex items-center justify-center hover:bg-gray-50"
                          onClick={() =>
                            setQtyMutation.mutate({
                              productId: item.productId,
                              quantity: item.quantity + 1
                            })
                          }
                          aria-label="Increase"
                          disabled={setQtyMutation.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-semibold">₱{subtotal}.00</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Delivery fee</span>
                  <span className="font-semibold">
                    ₱{effectiveDeliveryFee}.00
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-5 py-4 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Total</p>
            <p className="text-lg font-extrabold text-gray-900">
              ₱{items.length > 0 ? total : 0}.00
            </p>
          </div>

          <Button
            type="button"
            className="mt-4 w-full h-12 rounded-full bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
            disabled={items.length === 0}
          >
            Go To Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
