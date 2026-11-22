'use client';

import {useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {Layers, Plus, Utensils} from 'lucide-react';
import {cn} from '@/lib/utils';
import {useCartUiStore} from '@/app/store/cartUiStore';
import {flyWhenCartOpens} from '@/shared/motion/flyToCart';
import {useAllergenCatalog} from '@/lib/hooks/useAllergens';
import {formatMenuPrice, type MenuItem} from '../menuItems';

/** Allergen chips shown before the rest collapse into "+N". */
const VISIBLE_ALLERGENS = 2;
/** At or below this, the photo shows a "Few left" badge. */
const LOW_STOCK = 5;

/** Serving / allergen chips under the photo. */
const chipBase =
  'inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold leading-none';

const pillBase =
  'pointer-events-none rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-extrabold uppercase tracking-wide shadow-sm';

/**
 * Fast-food style menu card: square photo with the add button on its corner,
 * then (top to bottom) what a customer should know before tapping: serving
 * size and allergens, the name, a short description, and the price.
 * Tapping anywhere else on the card opens the item's detail page.
 */
export function MenuItemCard({
  item,
  cartQty = 0,
  guestLocked = false,
  onAdd
}: {
  item: MenuItem;
  /** How many of this item are already in the cart. */
  cartQty?: number;
  /** Guests may see a pre-order but must sign in to order it. */
  guestLocked?: boolean;
  onAdd: () => void;
}) {
  const [showAllAllergens, setShowAllAllergens] = useState(false);

  const allowanceReached =
    item.isPreOrder && item.preOrderAllowance != null && item.preOrderAllowance <= 0;
  const addDisabled =
    item.soldOut || guestLocked || !item.preOrderOrderable || item.preOrderClosed || allowanceReached;

  const catalog = useAllergenCatalog();
  const allergens = catalog.sort(item.allergens);
  const shownAllergens = showAllAllergens ? allergens : allergens.slice(0, VISIBLE_ALLERGENS);
  const hiddenCount = allergens.length - shownAllergens.length;
  const fewLeft = item.stock != null && item.stock > 0 && item.stock <= LOW_STOCK && !item.isPreOrder;
  // Struck-through "was" price: the regular price under a promo, or what a
  // bundle's items cost bought one by one.
  const wasPrice = item.wasPrice;

  const preOrderLine = item.isPreOrder
    ? guestLocked
      ? 'Sign in to order this pre-order'
      : allowanceReached
        ? 'Daily limit reached'
        : item.preOrderStatusLine || (item.preOrderClosed ? 'Pre-order closed' : 'Pre-order')
    : null;

  return (
    <div className="ux-lift group relative flex h-full flex-col rounded-3xl bg-white p-2 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] transition-shadow duration-200 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] sm:p-2.5 dark:bg-gray-900 dark:ring-white/10">
      <Link
        href={item.href}
        aria-label={`${item.name}, view details`}
        className="absolute inset-0 z-[1] rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d4a35]"
      />

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#f3f5f2] dark:bg-gray-800">
        <Image
          src={item.imageUrl && item.imageUrl.length > 0 ? item.imageUrl : '/assets/sample_menu.png'}
          alt=""
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {item.badge && <span className={cn(pillBase, 'bg-[#c30010] text-white')}>{item.badge}</span>}
          {item.isPreOrder && (
            <span
              className={cn(
                pillBase,
                'text-white',
                item.preOrderOrderable && !item.preOrderClosed && !guestLocked
                  ? 'bg-purple-700'
                  : 'bg-gray-500'
              )}
            >
              Pre-order
            </span>
          )}
          {fewLeft && <span className={cn(pillBase, 'bg-amber-400 text-amber-950')}>Few left</span>}
          {item.soldOut && <span className={cn(pillBase, 'bg-gray-800 text-white')}>Sold out</span>}
          {!item.soldOut && item.bundleSavings != null && (
            <span className={cn(pillBase, 'bg-[#7ed4a0] text-[#1f3527]')}>
              Save {formatMenuPrice(item.bundleSavings).replace(/\.00$/, '')}
            </span>
          )}
        </div>

        {cartQty > 0 && (
          <span
            key={cartQty}
            className="ux-squash ux-num pointer-events-none absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-gray-900 shadow-sm dark:bg-gray-900/95 dark:text-gray-100"
            aria-label={`${cartQty} in your cart`}
          >
            x{cartQty}
          </span>
        )}

        <button
          type="button"
          onClick={e => {
            const photo = e.currentTarget.parentElement;
            onAdd();
            // Visual only: the photo flies into the cart once it opens.
            flyWhenCartOpens(
              photo,
              item.id,
              () => useCartUiStore.getState().isOpen,
              listener => useCartUiStore.subscribe(s => listener(s.isOpen))
            );
          }}
          disabled={addDisabled}
          aria-label={
            addDisabled
              ? item.soldOut
                ? `${item.name} is sold out`
                : guestLocked
                ? `Sign in to order ${item.name}`
                : item.preOrderClosed
                  ? `Pre-order closed for ${item.name}`
                  : allowanceReached
                    ? `Daily order limit reached for ${item.name}`
                    : `Pre-order not open yet for ${item.name}`
              : `Add ${item.name} to order`
          }
          className={cn(
            'absolute bottom-2 right-2 z-10 grid h-11 w-11 place-items-center rounded-full shadow-md transition-[transform,background-color] sm:bottom-3 sm:right-3 sm:h-12 sm:w-12',
            addDisabled
              ? 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
              : 'bg-[#7ed4a0] text-[#1f3527] hover:scale-105 hover:bg-[#6cc790] active:scale-95'
          )}
        >
          <Plus className="h-6 w-6" strokeWidth={2.75} />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-2.5 sm:px-2 sm:pb-2">
        {(item.serving || item.bundleItemCount || allergens.length > 0) && (
          <ul
            className="mb-1.5 flex flex-wrap gap-1"
            aria-label={
              allergens.length > 0
                ? `Contains: ${allergens.map(a => catalog.label(a)).join(', ')}`
                : undefined
            }
          >
            {item.serving && (
              <li className={cn(chipBase, 'bg-[#2d4a35]/[0.08] text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]')}>
                <Utensils className="h-3 w-3 shrink-0" aria-hidden />
                {item.serving}
              </li>
            )}
            {item.bundleItemCount != null && item.bundleItemCount > 0 && (
              <li className={cn(chipBase, 'bg-[#2d4a35]/[0.08] text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]')}>
                <Layers className="h-3 w-3 shrink-0" aria-hidden />
                {item.bundleItemCount} items
              </li>
            )}
            {shownAllergens.map(allergen => {
              const Icon = catalog.icon(allergen);
              const note = catalog.isDietary(allergen);
              return (
                <li
                  key={allergen}
                  title={catalog.label(allergen)}
                  className={cn(
                    chipBase,
                    note
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      : 'bg-red-50 text-[#c30010] dark:bg-red-500/10 dark:text-red-300'
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" aria-hidden />
                  {catalog.shortLabel(allergen)}
                </li>
              );
            })}
            {allergens.length > VISIBLE_ALLERGENS && (
              <li className="relative z-10">
                <button
                  type="button"
                  onClick={() => setShowAllAllergens(v => !v)}
                  aria-expanded={showAllAllergens}
                  aria-label={showAllAllergens ? 'Show fewer allergens' : `Show ${hiddenCount} more allergens`}
                  className="inline-flex min-h-[22px] items-center rounded-full bg-gray-100 px-2 text-[11px] font-bold leading-none text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {showAllAllergens ? 'Less' : `+${hiddenCount}`}
                </button>
              </li>
            )}
          </ul>
        )}

        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-800 sm:text-base dark:text-gray-100">
          {item.name}
        </p>

        {item.note && item.note.trim().length > 0 && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-gray-500 sm:text-[13px] dark:text-gray-400">
            {item.note}
          </p>
        )}

        {preOrderLine && (
          <p
            className={cn(
              'mt-1 line-clamp-2 text-xs font-semibold leading-snug',
              item.preOrderOrderable && !item.preOrderClosed && !guestLocked && !allowanceReached
                ? 'text-purple-700 dark:text-purple-300'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {preOrderLine}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1.5">
          <span className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl dark:text-gray-50">
            {formatMenuPrice(item.displayPrice)}
          </span>
          {wasPrice != null && (
            <span className="text-sm text-gray-400 line-through">{formatMenuPrice(wasPrice)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MenuItemCardSkeleton() {
  return (
    <div className="flex flex-col rounded-3xl bg-white p-2 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] sm:p-2.5 dark:bg-gray-900 dark:ring-white/10">
      <div className="aspect-square w-full animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-2 px-1.5 pb-1.5 pt-3 sm:px-2">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="h-6 w-1/2 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}
