'use client';

import {useMemo} from 'react';
import Image from 'next/image';
import {X, Minus, Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {getCartSubtotal, useCartStore} from '@/app/store/cartStore';
import {useCartUiStore} from '@/app/store/cartUiStore';

type CartDrawerProps = {
  deliveryFee?: number;
};

export default function CartDrawer({deliveryFee = 49}: CartDrawerProps) {
  const isOpen = useCartUiStore(s => s.isOpen);
  const close = useCartUiStore(s => s.close);
  const items = useCartStore(s => s.items);
  const setQty = useCartStore(s => s.setQty);
  const removeItem = useCartStore(s => s.removeItem);

  const subtotal = useMemo(() => getCartSubtotal(items), [items]);
  const total = subtotal + (items.length > 0 ? deliveryFee : 0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={
          'fixed bg-white shadow-2xl flex flex-col ' +
          'w-full md:w-105 ' +
          'bottom-0 md:bottom-auto md:top-0 md:right-0 ' +
          'h-[85dvh] md:h-dvh ' +
          'rounded-t-3xl md:rounded-none'
        }
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900">
              My Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Delivery, Today, ASAP
            </p>
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
          {items.length === 0 ? (
            <div className="text-sm text-gray-500 py-10 text-center">
              Your cart is empty.
            </div>
          ) : (
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
                          onClick={() => removeItem(item.productId)}
                        >
                          Remove
                        </button>
                      </div>

                      <p className="text-sm font-bold text-gray-900 shrink-0">
                        ₱{item.price}.00
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      <div className="inline-flex items-center rounded-full border border-gray-200 overflow-hidden">
                        <button
                          type="button"
                          className="h-8 w-10 inline-flex items-center justify-center hover:bg-gray-50"
                          onClick={() =>
                            setQty(item.productId, Math.max(1, item.qty - 1))
                          }
                          aria-label="Decrease"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <div className="min-w-10 text-center text-sm font-semibold text-gray-900">
                          {item.qty}
                        </div>
                        <button
                          type="button"
                          className="h-8 w-10 inline-flex items-center justify-center hover:bg-gray-50"
                          onClick={() => setQty(item.productId, item.qty + 1)}
                          aria-label="Increase"
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
                  <span className="font-semibold">₱{deliveryFee}.00</span>
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
            className="mt-4 w-full h-12 rounded-full bg-[#c30010] text-white hover:bg-[#a6000d]"
            disabled={items.length === 0}
          >
            Go To Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
