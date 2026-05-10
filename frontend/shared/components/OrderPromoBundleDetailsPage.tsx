'use client';

import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {usePromoQuery} from '@/lib/hooks/promos/usePromos';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import {ArrowLeft, Minus, Plus, ShoppingCart} from 'lucide-react';
import Image from 'next/image';
import {usePathname, useRouter} from 'next/navigation';
import {useMemo, useState} from 'react';
import {useCartStore} from '@/app/store/cartStore';
import {
  useAddCustomerCartItemMutation,
  useCustomerCartQuery
} from '@/lib/hooks/cart/useCustomerCart';
import {useCartUiStore} from '@/app/store/cartUiStore';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {getDiscountedUnitPrice} from '@/lib/utils/promoPricing';

export default function OrderPromoBundleDetailsPage({id}: {id: string}) {
  const promoQuery = usePromoQuery(id);
  const productsQuery = useProductsQuery();

  const promosQuery = usePublicPromosQuery();
  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data?.promos]
  );

  const promo = promoQuery.data?.promo;
  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products]
  );

  const includedProducts = useMemo(() => {
    if (!promo?.productIds?.length) return [];
    const set = new Set(promo.productIds);
    return products.filter(p => set.has(p._id));
  }, [products, promo]);

  const router = useRouter();
  const pathname = usePathname();
  const isCustomerRoute = pathname.startsWith('/customer');

  const openCart = useCartUiStore(s => s.open);
  const cartQuery = useCustomerCartQuery(isCustomerRoute);
  const cartItems = useMemo(
    () => cartQuery.data?.cart?.items ?? [],
    [cartQuery.data]
  );
  const cartUniqueCount = cartItems.length;
  const cartSubtotal = useMemo(() => {
    if (promos.length === 0) {
      return cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }

    return cartItems.reduce((sum, i) => {
      const {unitPrice} = getDiscountedUnitPrice({
        promos,
        productId: i.productId,
        basePrice: i.price
      });
      return sum + unitPrice * i.quantity;
    }, 0);
  }, [cartItems, promos]);

  const addItem = useCartStore(s => s.addItem);

  const addCustomerCartItemMutation = useAddCustomerCartItemMutation();

  const [qty, setQty] = useState(1);
  const [instructions, setInstructions] = useState('');

  const unitPrice =
    promo?.promoType === 'bundle' && typeof promo.price === 'number'
      ? promo.price
      : 0;

  const total = unitPrice * qty;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center">
      <div className="w-full max-w-6xl mx-auto px-4 py-6">
        {isCustomerRoute ? (
          <div className="flex justify-end mb-4">
            <Button
              type="button"
              onClick={() => openCart()}
              variant="ghost"
              className="relative rounded-full"
              aria-label="Open cart"
            >
              <span className="relative">
                <ShoppingCart className="h-5 w-5 text-[#2d4a35]" />
                {cartUniqueCount > 0 && (
                  <span className="absolute -right-2 -top-2 h-5 min-w-5 px-1 rounded-full bg-[#c30010] text-white text-[10px] font-bold grid place-items-center">
                    {cartUniqueCount}
                  </span>
                )}
              </span>
              {cartUniqueCount > 0 && (
                <span className="ml-2 text-sm font-semibold text-[#2d4a35]">
                  ₱{cartSubtotal}.00
                </span>
              )}
            </Button>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Bundle details</h1>
        </div>

        {(promoQuery.isLoading || productsQuery.isLoading) && (
          <div className="mt-8 text-sm text-gray-500">Loading bundle...</div>
        )}

        {(promoQuery.isError || productsQuery.isError) && (
          <div className="mt-8 text-sm text-gray-500">
            Failed to load bundle.
          </div>
        )}

        {promo &&
          promo.promoType === 'bundle' &&
          typeof promo.price === 'number' && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
              <div className="w-full">
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white border border-gray-100">
                  <Image
                    src={
                      promo.imageUrl && promo.imageUrl.length > 0
                        ? promo.imageUrl
                        : '/assets/sample_menu.png'
                    }
                    alt={promo.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>

              <div className="w-full">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-900">
                      {promo.title}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Promo Bundle</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ₱{promo.price}.00
                    </p>
                  </div>
                </div>

                {promo.description && (
                  <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                    {promo.description}
                  </p>
                )}

                {includedProducts.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-semibold text-gray-900">
                      Included
                    </p>
                    <div className="mt-2 space-y-2">
                      {includedProducts.map(p => (
                        <div
                          key={p._id}
                          className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                              {p.name}
                            </p>
                            {p.category && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {p.category}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-bold text-gray-900 shrink-0">
                            ₱{p.price}.00
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <Label className="text-sm font-semibold text-gray-900">
                    Special instructions
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Add a note for the kitchen (e.g. no ginger, less spicy).
                  </p>
                  <textarea
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    placeholder="Type your request here..."
                    className="mt-3 w-full min-h-28 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3c5e45]/20 focus:border-[#3c5e45]"
                  />
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <div className="inline-flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5 text-gray-600" />
                    </button>

                    <span className="min-w-6 text-center text-base font-semibold text-gray-900">
                      {qty}
                    </span>

                    <button
                      type="button"
                      onClick={() => setQty(q => q + 1)}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5 text-gray-600" />
                    </button>
                  </div>

                  <Button
                    type="button"
                    disabled={!promo || unitPrice <= 0}
                    onClick={() => {
                      if (!promo || unitPrice <= 0) return;
                      if (isCustomerRoute) {
                        addCustomerCartItemMutation.mutate({
                          productId: promo._id,
                          name: promo.title,
                          price: unitPrice,
                          quantity: qty,
                          imageUrl: promo.imageUrl
                        });
                      } else {
                        addItem({
                          productId: promo._id,
                          name: promo.title,
                          price: unitPrice,
                          imageUrl: promo.imageUrl,
                          qty,
                          instructions: instructions.trim().length
                            ? instructions.trim()
                            : undefined
                        });
                      }
                      openCart();
                    }}
                    className="flex-1 h-12 rounded-full bg-[#3c5e45] text-white "
                  >
                    Add to Cart - <span className="font-bold">₱{total}.00</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
