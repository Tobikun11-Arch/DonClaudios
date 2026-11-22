'use client';

import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import {AlertTriangle, ArrowLeft, Layers, Minus, Plus, ShoppingCart, Utensils} from 'lucide-react';
import Image from 'next/image';
import {usePathname, useRouter} from 'next/navigation';
import {useMemo, useState} from 'react';
import {useCartStore} from '@/app/store/cartStore';
import {
  useAddCustomerCartItemMutation,
  useCustomerCartQuery
} from '@/lib/hooks/cart/useCustomerCart';
import {useCartUiStore} from '@/app/store/cartUiStore';
import {getDiscountedUnitPrice} from '@/lib/utils/promoPricing';
import {formatServing, isBundleProduct, summarizeBundle} from '@/lib/menu/bundles';
import {formatMenuPrice} from '@/features/menu/menuItems';
import {AllergenBadges} from './AllergenBadges';

/** "₱1,250" for whole pesos, "₱1,250.50" otherwise. */
function peso(n: number) {
  return formatMenuPrice(n).replace(/\.00$/, '');
}

/**
 * A Bundle Deal: a product in the owner's Promo category with the items it
 * includes. Stock, allergens and the savings come from those items.
 */
export default function OrderPromoBundleDetailsPage({id}: {id: string}) {
  const productsQuery = useProductsQuery();

  const promosQuery = usePublicPromosQuery();
  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data?.promos]
  );

  const productsById = useMemo(
    () => new Map((productsQuery.data?.products ?? []).map(p => [p._id, p])),
    [productsQuery.data?.products]
  );
  // The list only holds Promo items that are live, so a missing bundle is
  // switched off, out of its dates, or deleted.
  const bundle = productsById.get(id);
  const isBundle = isBundleProduct(bundle);

  const summary = useMemo(
    () => (bundle && isBundle ? summarizeBundle(bundle, productsById) : null),
    [bundle, isBundle, productsById]
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
  const cartSubtotal = useMemo(
    () =>
      cartItems.reduce((sum, i) => {
        const {unitPrice} = getDiscountedUnitPrice({
          promos,
          productId: i.productId,
          basePrice: i.price
        });
        return sum + unitPrice * i.quantity;
      }, 0),
    [cartItems, promos]
  );

  const guestCart = useCartStore(s => s.items);
  const addItem = useCartStore(s => s.addItem);
  const addCustomerCartItemMutation = useAddCustomerCartItemMutation();

  const [qty, setQty] = useState(1);
  const [instructions, setInstructions] = useState('');

  const unitPrice = bundle && isBundle ? bundle.price : 0;

  // Stock is shared with the single items, so subtract bundles already in
  // the cart from what the current stock can make.
  const inCart = isCustomerRoute
    ? (cartItems.find(i => i.productId === id)?.quantity ?? 0)
    : (guestCart.find(i => i.productId === id)?.qty ?? 0);
  const maxMore = Math.max(0, (summary?.maxOrderable ?? 0) - inCart);
  const soldOut = !summary?.available;
  const canAdd = isBundle && !soldOut && maxMore > 0 && qty <= maxMore;

  const total = unitPrice * qty;
  const savingsPct =
    summary && summary.originalTotal > 0
      ? Math.round((summary.savings / summary.originalTotal) * 100)
      : 0;
  const itemCount = summary?.components.reduce((n, c) => n + c.qty, 0) ?? 0;

  const handleAdd = () => {
    if (!bundle || !canAdd) return;
    const note = instructions.trim().length ? instructions.trim() : undefined;
    if (isCustomerRoute) {
      addCustomerCartItemMutation.mutate({
        productId: bundle._id,
        name: bundle.name,
        price: unitPrice,
        quantity: qty,
        imageUrl: bundle.imageUrl,
        instructions: note
      });
    } else {
      addItem({
        productId: bundle._id,
        name: bundle.name,
        price: unitPrice,
        imageUrl: bundle.imageUrl,
        qty,
        instructions: note
      });
    }
    openCart();
  };

  return (
    <div className="flex min-h-screen justify-center bg-gray-50 dark:bg-gray-800">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {isCustomerRoute ? (
          <div className="mb-4 flex justify-end">
            <Button
              type="button"
              onClick={() => openCart()}
              variant="ghost"
              className="relative rounded-full"
              aria-label="Open cart"
            >
              <span className="relative">
                <ShoppingCart className="h-5 w-5 text-[#2d4a35] dark:text-[#7ed4a0]" />
                {cartUniqueCount > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#c30010] px-1 text-[10px] font-bold text-white">
                    {cartUniqueCount}
                  </span>
                )}
              </span>
              {cartUniqueCount > 0 && (
                <span className="ml-2 text-sm font-semibold text-[#2d4a35] dark:text-[#7ed4a0]">
                  {formatMenuPrice(cartSubtotal)}
                </span>
              )}
            </Button>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Bundle details</h1>
        </div>

        {productsQuery.isLoading && (
          <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">Loading bundle...</div>
        )}

        {productsQuery.isError && (
          <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">Failed to load bundle.</div>
        )}

        {!productsQuery.isLoading && !productsQuery.isError && !summary && (
          <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
            This bundle is not available right now.
          </div>
        )}

        {bundle && summary && (
          <div className="mt-8 grid grid-cols-1 items-start gap-10 md:grid-cols-2">
            <div className="w-full md:sticky md:top-24">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-900">
                <Image
                  src={bundle.imageUrl && bundle.imageUrl.length > 0 ? bundle.imageUrl : '/assets/sample_menu.png'}
                  alt={bundle.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {soldOut && (
                  <span className="absolute left-3 top-3 rounded-full bg-gray-800 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
                    Sold out
                  </span>
                )}
              </div>
            </div>

            <div className="w-full">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#c30010] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
                <Layers className="h-3.5 w-3.5" aria-hidden />
                Bundle deal · {itemCount} items
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
                {bundle.name}
              </h2>

              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
                  {formatMenuPrice(bundle.price)}
                </span>
                {summary.savings > 0 && (
                  <>
                    <span className="text-base text-gray-400 line-through">
                      {formatMenuPrice(summary.originalTotal)}
                    </span>
                    <span className="rounded-full bg-[#7ed4a0]/30 px-2.5 py-0.5 text-sm font-bold text-[#1f3527] dark:bg-[#7ed4a0]/15 dark:text-[#7ed4a0]">
                      You save {peso(summary.savings)}
                      {savingsPct > 0 ? ` (${savingsPct}%)` : ''}
                    </span>
                  </>
                )}
              </div>

              {bundle.description && (
                <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{bundle.description}</p>
              )}

              <div className="mt-6">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">What&apos;s included</p>
                <ul className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900">
                  {summary.components.map(({product, qty: each}) => {
                    const serving = formatServing(product.servingQty, product.servingUnit);
                    return (
                      <li key={product._id} className="flex items-center gap-3 px-3 py-3">
                        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                          <Image
                            src={product.imageUrl && product.imageUrl.length > 0 ? product.imageUrl : '/assets/sample_menu.png'}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            <span className="tabular-nums text-[#2d4a35] dark:text-[#7ed4a0]">{each}×</span>{' '}
                            {product.name}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500 dark:text-gray-400">
                            {serving && (
                              <span className="inline-flex items-center gap-1">
                                <Utensils className="h-3 w-3" aria-hidden />
                                {serving}
                              </span>
                            )}
                            <span>{product.category}</span>
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-sm tabular-nums text-gray-500 dark:text-gray-400">
                          {formatMenuPrice(product.price * each)}
                        </p>
                      </li>
                    );
                  })}
                  {summary.savings > 0 && (
                    <li className="space-y-1 bg-gray-50 px-3 py-3 text-sm dark:bg-gray-800/60">
                      <div className="flex justify-between text-gray-500 dark:text-gray-400">
                        <span>Bought separately</span>
                        <span className="tabular-nums line-through">{formatMenuPrice(summary.originalTotal)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100">
                        <span>Bundle price</span>
                        <span className="tabular-nums">{formatMenuPrice(bundle.price)}</span>
                      </div>
                    </li>
                  )}
                </ul>
                {summary.missingCount > 0 && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                    {summary.missingCount === 1 ? 'One item in this bundle is' : `${summary.missingCount} items in this bundle are`}{' '}
                    not available right now, so it can&apos;t be ordered.
                  </p>
                )}
              </div>

              <AllergenBadges allergens={summary.allergens} />

              <div className="mt-8">
                <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Order notes</Label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Add a note for the kitchen (e.g. no ginger, less spicy).
                </p>
                <textarea
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="Type your request here..."
                  className="mt-3 min-h-28 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3c5e45] focus:outline-none focus:ring-2 focus:ring-[#3c5e45]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-[#7ed4a0]/60"
                />
              </div>

              <div className="mt-8 flex items-center gap-4">
                <div className="inline-flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                  </button>
                  <span className="min-w-6 text-center text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(q => Math.min(Math.max(1, maxMore), q + 1))}
                    disabled={qty >= maxMore}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>

                <Button
                  type="button"
                  disabled={!canAdd}
                  onClick={handleAdd}
                  className="h-12 flex-1 rounded-full bg-[#3c5e45] text-white"
                >
                  {soldOut ? (
                    'Sold out'
                  ) : maxMore === 0 ? (
                    'Max in cart'
                  ) : (
                    <>
                      Add to Cart - <span className="font-bold">{formatMenuPrice(total)}</span>
                    </>
                  )}
                </Button>
              </div>
              {!soldOut && maxMore > 0 && maxMore <= 5 && (
                <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Only {maxMore} more can be made with today&apos;s stock.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
