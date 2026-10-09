'use client';

import Link from 'next/link';
import Image from 'next/image';
import {Plus} from 'lucide-react';
import {cn} from '@/lib/utils';

function FeaturedMenuItemCard({
  id,
  name,
  price,
  imageUrl,
  note,
  basePath = '',
  href,
  badge,
  isPreOrder = false,
  preOrderClosed = false,
  preOrderOrderable = true,
  /** Guests may view a pre-order but cannot order one — lock the button. */
  preOrderGuestLocked = false,
  preOrderLimit,
  preOrderAllowance,
  preOrderStatusLine,
  preOrderSubLine,
  onAdd
}: {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  note?: string;
  basePath?: string;
  href?: string;
  badge?: {
    label: string;
    variant?: 'promo' | 'bundle';
  };
  /** Pre-order items are only reachable by signed-in customers. */
  isPreOrder?: boolean;
  preOrderClosed?: boolean;
  /** A batch window is open — the plus button may be pressed. */
  preOrderOrderable?: boolean;
  /** Guest viewer: show the pre-order but keep the add button locked. */
  preOrderGuestLocked?: boolean;
  preOrderLimit?: number | null;
  /** Signed-in customer's remaining daily allowance (null = unknown). */
  preOrderAllowance?: number | null;
  preOrderStatusLine?: string;
  preOrderSubLine?: string;
  onAdd: () => void;
}) {
  const linkHref = href ?? `/${basePath}/${encodeURIComponent(id)}`;
  // Waiting for the next batch is a soft "not now" — greyed, not "closed".
  // Guests are always locked out even when a batch is open.
  const allowanceReached =
    isPreOrder && preOrderAllowance != null && preOrderAllowance <= 0;
  const addDisabled =
    preOrderGuestLocked ||
    !preOrderOrderable ||
    preOrderClosed ||
    allowanceReached;

  return (
    <div className="group relative min-h-[240px] rounded-[20px] bg-white border border-gray-200 shadow-sm px-4 pt-28 pb-6 transition-colors duration-200 hover:bg-[#2d4a35] active:bg-[#2d4a35]">
      <Link
        href={linkHref}
        aria-label={name}
        className="absolute inset-x-0 top-[-28px] bottom-0 z-[1] rounded-[20px]"
      />

      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-1/4 h-[112px] w-[112px]">
        <Image
          src={
            imageUrl && imageUrl.length > 0
              ? imageUrl
              : '/assets/sample_menu.png'
          }
          alt={name}
          fill
          className="rounded-full object-cover ring-4 ring-white"
        />
      </div>

      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
        {badge ? (
          <div className="pointer-events-none rounded-full bg-[#c30010] px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-white">
            {badge.label}
          </div>
        ) : null}
        {isPreOrder && (
          <div
            className={cn(
              'pointer-events-none rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-white',
              preOrderClosed
                ? 'bg-gray-500'
                : preOrderGuestLocked
                  ? 'bg-gray-500'
                  : preOrderOrderable
                    ? 'bg-purple-700'
                    : 'bg-purple-400'
            )}
          >
            {preOrderGuestLocked
              ? 'PRE-ORDER · SIGN IN'
              : preOrderClosed
                ? 'PRE-ORDER CLOSED'
                : preOrderOrderable
                  ? 'PRE-ORDER LIVE'
                  : 'PRE-ORDER'}
          </div>
        )}
      </div>

      <div className="relative z-0 pointer-events-none text-center">
        <p className="text-[18px] font-bold text-[#1a1a1a] leading-snug line-clamp-2 transition-colors duration-200 group-hover:text-white group-active:text-white">
          {name}
        </p>

        {isPreOrder ? (
          <div className="mt-2 min-h-8 leading-snug">
            <p
              className={cn(
                'text-[11px] font-semibold transition-colors duration-200 group-hover:text-white group-active:text-white',
                preOrderGuestLocked
                  ? 'text-gray-500'
                  : preOrderOrderable && !preOrderClosed
                    ? 'text-purple-700'
                    : 'text-gray-500'
              )}
            >
              {preOrderGuestLocked
                ? 'Sign in to order pre-orders'
                : preOrderStatusLine ||
                  (preOrderClosed ? 'Pre-order closed' : 'Pre-order')}
            </p>
            {preOrderGuestLocked ? (
              <p className="text-[11px] text-gray-500 transition-colors duration-200 group-hover:text-white/70 group-active:text-white/70">
                Register / log in as a customer.
              </p>
            ) : preOrderSubLine ||
              (typeof preOrderLimit === 'number' && preOrderLimit >= 1) ||
              preOrderAllowance != null ? (
              <p className="text-[11px] text-gray-500 transition-colors duration-200 group-hover:text-white/70 group-active:text-white/70">
                {preOrderSubLine ||
                  (typeof preOrderLimit === 'number' && preOrderLimit >= 1
                    ? `Max ${preOrderLimit} per customer`
                    : '')}
                {preOrderAllowance != null ? (
                  <span
                    className={cn(
                      'block font-semibold transition-colors duration-200 group-hover:text-white/70 group-active:text-white/70',
                      preOrderAllowance > 0
                        ? 'text-purple-700'
                        : 'text-[#c30010]'
                    )}
                  >
                    {preOrderAllowance > 0
                      ? `You can still order ${preOrderAllowance} today`
                      : 'Daily limit reached'}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : note ? (
          <p className="text-[12px] text-gray-500 mt-2 leading-snug line-clamp-2 min-h-8 transition-colors duration-200 group-hover:text-white/70 group-active:text-white/70">
            {note}
          </p>
        ) : (
          <div className="min-h-8 mt-2" />
        )}

        <div className="mt-5 flex items-center justify-start pr-12">
          <span className="text-[17px] font-bold text-[#1a1a1a] transition-colors duration-200 group-hover:text-white group-active:text-white">
            ₱{price}.00
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={addDisabled}
        aria-label={
          addDisabled
            ? preOrderGuestLocked
              ? `Sign in to order pre-orders for ${name}`
              : preOrderClosed
                ? `Pre-order closed for ${name}`
                : allowanceReached
                  ? `Daily order limit reached for ${name}`
                  : `Pre-order not open yet for ${name}`
            : `Add ${name} to order`
        }
        className={cn(
          'absolute bottom-6 right-4 z-10 w-10 h-10 rounded-full grid place-items-center transition-colors shadow-md border',
          addDisabled
            ? 'cursor-not-allowed bg-gray-200 text-gray-400 border-gray-300'
            : 'bg-[#fbd897] text-[#2d4a35] hover:bg-white border-[#2d4a35]/20'
        )}
      >
        <Plus size={20} strokeWidth={3} />
      </button>
    </div>
  );
}

export default FeaturedMenuItemCard;