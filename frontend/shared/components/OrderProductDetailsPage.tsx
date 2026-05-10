'use client';

import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {useProductQuery} from '@/lib/hooks/products/useProducts';
import {ArrowLeft, Minus, Plus, ShoppingCart} from 'lucide-react';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useMemo, useState} from 'react';
import {useCartStore} from '@/app/store/cartStore';
import {usePathname} from 'next/navigation';
import {useAddCustomerCartItemMutation} from '@/lib/hooks/cart/useCustomerCart';
import {useCartUiStore} from '@/app/store/cartUiStore';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {
  getDiscountedUnitPrice,
  getPromoBadgeForProduct
} from '@/lib/utils/promoPricing';
import {useCustomerCartQuery} from '@/lib/hooks/cart/useCustomerCart';

export default function OrderProductDetailsPage({id}: {id: string}) {
  const productQuery = useProductQuery(id);
  const product = productQuery.data?.product;
  const promosQuery = usePublicPromosQuery();
  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data?.promos]
  );
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

  const total = useMemo(() => {
    if (!product) return 0;
    const {unitPrice} = getDiscountedUnitPrice({
      promos,
      productId: product._id,
      basePrice: product.price
    });
    return unitPrice * qty;
  }, [product, promos, qty]);

  const badge = useMemo(() => {
    if (!product) return null;
    return getPromoBadgeForProduct({promos, productId: product._id});
  }, [product, promos]);

  return (
    <div
      className={
        isCustomerRoute
          ? 'min-h-screen bg-gray-50'
          : 'min-h-screen bg-gray-50 flex justify-center items-center'
      }
    >
      <div
        className={
          'w-full max-w-6xl mx-auto px-4 py-6' +
          (isCustomerRoute ? ' pb-28' : '')
        }
      >
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
          <h1 className="text-lg font-bold text-gray-900">Product details</h1>
        </div>

        {productQuery.isLoading && (
          <div className="mt-8 text-sm text-gray-500">Loading product...</div>
        )}

        {productQuery.isError && (
          <div className="mt-8 text-sm text-gray-500">
            Failed to load product.
          </div>
        )}

        {product && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div className="w-full">
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white border border-gray-100">
                <Image
                  src={
                    product.imageUrl && product.imageUrl.length > 0
                      ? product.imageUrl
                      : '/assets/sample_menu.png'
                  }
                  alt={product.name}
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
                    {product.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {product.category}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {(() => {
                    const {unitPrice} = getDiscountedUnitPrice({
                      promos,
                      productId: product._id,
                      basePrice: product.price
                    });
                    const isDiscounted = unitPrice < product.price;
                    return (
                      <>
                        <p className="text-sm font-bold text-gray-900">
                          ₱{unitPrice}.00
                        </p>
                        {isDiscounted ? (
                          <p className="text-[11px] text-gray-400 line-through">
                            ₱{product.price}.00
                          </p>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              </div>

              {badge ? (
                <div className="mt-3 inline-flex items-center rounded-full bg-[#c30010] text-white px-3 py-1 text-xs font-extrabold">
                  {badge.label}
                </div>
              ) : null}

              {product.description && (
                <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                  {product.description}
                </p>
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

              <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="inline-flex items-center justify-center sm:justify-start gap-3">
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
                  disabled={!product}
                  onClick={() => {
                    if (!product) return;
                    if (isCustomerRoute) {
                      addCustomerCartItemMutation.mutate({
                        productId: product._id,
                        name: product.name,
                        price: product.price,
                        quantity: qty,
                        imageUrl: product.imageUrl
                      });
                    } else {
                      addItem({
                        productId: product._id,
                        name: product.name,
                        price: product.price,
                        imageUrl: product.imageUrl,
                        qty,
                        instructions: instructions.trim().length
                          ? instructions.trim()
                          : undefined
                      });
                    }
                    openCart();
                  }}
                  className="w-full sm:flex-1 h-12 rounded-full bg-[#3c5e45] text-white"
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
