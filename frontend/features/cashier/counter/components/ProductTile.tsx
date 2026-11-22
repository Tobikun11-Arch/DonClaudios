'use client';

import Image from 'next/image';
import {cn} from '@/lib/utils';
import {FALLBACK_PRODUCT_IMAGE, peso} from '../counterShared';

const LOW_STOCK = 5;

/** What a tile needs: a product, or a bundle shaped like one. */
export type TileItem = {
  _id: string;
  name: string;
  imageUrl?: string;
  /** The price charged (after any active promo). */
  price: number;
  /** For a bundle: how many the current stock can make. */
  stock: number;
  isAvailable: boolean;
};

export default function ProductTile({
  product,
  qtyInOrder,
  onAdd,
  wasPrice,
  badge
}: {
  product: TileItem;
  qtyInOrder: number;
  onAdd: () => void;
  /** Struck-through regular price when a promo applies. */
  wasPrice?: number;
  /** e.g. "Bundle · 3 items" or "20% OFF". */
  badge?: string;
}) {
  const soldOut = product.stock <= 0;
  const disabled = soldOut || !product.isAvailable;
  const unavailableLabel = soldOut ? 'Sold out' : 'Unavailable';
  const lowStock = !disabled && product.stock <= LOW_STOCK;
  const inOrder = qtyInOrder > 0;

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      aria-label={
        disabled
          ? `${product.name}, ${unavailableLabel.toLowerCase()}`
          : `Add ${product.name}, ${peso(product.price)}${inOrder ? `, ${qtyInOrder} in order` : ''}`
      }
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d4a35]/50',
        disabled
          ? 'cursor-not-allowed border-gray-100 opacity-60'
          : 'border-gray-200 hover:border-[#2d4a35]/40 hover:shadow-md active:scale-[0.98]',
        inOrder && 'border-[#2d4a35] ring-1 ring-[#2d4a35]'
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-gray-100">
        <Image
          src={
            product.imageUrl && product.imageUrl.length > 0
              ? product.imageUrl
              : FALLBACK_PRODUCT_IMAGE
          }
          alt=""
          fill
          sizes="(min-width: 1536px) 15vw, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw"
          className={cn('object-cover', disabled && 'grayscale')}
        />
        {inOrder && (
          <span className="absolute right-2 top-2 grid h-8 min-w-8 place-items-center rounded-full bg-[#2d4a35] px-2 text-sm font-bold tabular-nums text-white shadow">
            {qtyInOrder}
          </span>
        )}
        {disabled && (
          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-xs font-semibold uppercase tracking-wide text-white">
            {unavailableLabel}
          </span>
        )}
        {(lowStock || badge) && (
          <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {badge && (
              <span className="rounded-full bg-[#c30010] px-2 py-0.5 text-[11px] font-bold text-white">
                {badge}
              </span>
            )}
            {lowStock && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                {product.stock} left
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
          {product.name}
        </p>
        <p className="mt-auto flex flex-wrap items-baseline gap-x-1.5 text-sm font-bold tabular-nums text-[#2d4a35]">
          {peso(product.price)}
          {wasPrice != null && wasPrice > product.price && (
            <span className="text-xs font-medium text-gray-400 line-through">{peso(wasPrice)}</span>
          )}
        </p>
      </div>
    </button>
  );
}
