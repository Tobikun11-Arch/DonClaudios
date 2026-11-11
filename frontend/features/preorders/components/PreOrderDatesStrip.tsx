'use client';

import Image from 'next/image';
import Link from 'next/link';
import {CalendarHeart, ChevronRight, Lock} from 'lucide-react';
import {useOpenPreOrders} from '@/lib/hooks/preorders/usePreOrders';
import type {PreOrderEvent} from '@/lib/api/preOrderApi';
import {daysUntil, peso, shortDate, weekday} from '../utils';

function DateCard({event, href, signedIn}: {event: PreOrderEvent; href: string; signedIn: boolean}) {
  const [month, day] = shortDate(event.pickupDate).split(' ');
  const photos = event.products.map(p => p.imageUrl).filter(Boolean).slice(0, 3) as string[];
  const days = daysUntil(event.pickupDate);
  const ordered = (event.mine?.orderIds.length ?? 0) > 0;
  const full = ordered && (event.mine?.orderIds.length ?? 0) >= (event.maxOrdersPerCustomer ?? 1);

  return (
    <Link
      href={href}
      className={`group relative flex w-[19rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white transition-all md:w-auto dark:bg-gray-900 ${
        event.soldOut
          ? 'border-gray-200 opacity-70 dark:border-gray-700'
          : 'border-[#e3ece5] hover:-translate-y-0.5 hover:border-[#2d4a35]/40 hover:shadow-lg dark:border-gray-700 dark:hover:border-[#7ed4a0]/40'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#3c5e45] text-white">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#fbd897]">{month}</span>
          <span className="text-3xl font-bold leading-none">{day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 pr-14 text-lg font-bold leading-snug text-gray-900 dark:text-gray-100">{event.title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{weekday(event.pickupDate)}</p>
          <p className="mt-1 text-base font-bold text-[#2d4a35] dark:text-[#7ed4a0]">
            {event.soldOut ? 'Fully booked' : event.fromPrice != null ? `From ${peso(event.fromPrice)}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[#eef3ef] bg-[#f7faf6] px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex -space-x-2">
          {photos.map((src, i) => (
            <span key={i} className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
              <Image src={src} alt="" fill sizes="28px" className="object-cover" />
            </span>
          ))}
          {event.products.length > photos.length && (
            <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white dark:border-gray-800 bg-[#e9f5ee] text-[0.65rem] font-bold text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]">
              +{event.products.length - photos.length}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-[#2d4a35] dark:text-[#7ed4a0]">
          {!signedIn && <Lock size={14} />}
          {full ? 'View my pre-order' : event.soldOut ? 'View' : signedIn ? 'Pre-order' : 'Sign in to order'}
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>

      {ordered && (
        <span className="absolute right-3 top-3 rounded-full bg-[#e9f5ee] px-2.5 py-1 text-xs font-bold text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]">
          Pre-ordered
        </span>
      )}
      {!ordered && days <= 14 && days >= 0 && !event.soldOut && (
        <span className="absolute right-3 top-3 rounded-full bg-[#fff4dd] px-2.5 py-1 text-xs font-bold text-[#9a6400] dark:bg-amber-500/10 dark:text-amber-300">
          {days === 0 ? 'Today' : `${days}d left`}
        </span>
      )}
    </Link>
  );
}

/**
 * "Holiday Pre-orders" row shown above the menu. Renders nothing when no date
 * is open, so the menu looks the same outside the season.
 */
export default function PreOrderDatesStrip({signedIn}: {signedIn: boolean}) {
  const {data: events = [], isLoading} = useOpenPreOrders();
  if (isLoading) return <PreOrderDatesStripSkeleton />;
  if (events.length === 0) return null;

  return (
    <section className="mb-10" aria-labelledby="holiday-preorders">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="holiday-preorders" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
            <CalendarHeart className="h-6 w-6 sm:h-7 sm:w-7 text-[#c30010] dark:text-red-400" />
            Holiday Pre-orders
          </h2>
          <p className="mt-1 text-sm text-gray-500 sm:text-base dark:text-gray-400">
            Reserve your lechon for the holidays. Limited sizes and pickup slots per date.
          </p>
        </div>
      </div>
      <div className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3">
        {events.map(e => (
          <DateCard
            key={e._id}
            event={e}
            signedIn={signedIn}
            href={signedIn ? `/customer/dashboard/preorder/${e._id}` : '/sign-in'}
          />
        ))}
      </div>
    </section>
  );
}

/** Same footprint as the strip so the menu below does not jump when it loads. */
function PreOrderDatesStripSkeleton() {
  return (
    <section className="mb-10" aria-busy="true" aria-label="Loading holiday pre-orders">
      <div className="mb-3 space-y-2">
        <div className="h-8 w-60 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="-mx-4 flex gap-4 overflow-hidden px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:px-0 xl:grid-cols-3">
        {Array.from({length: 3}).map((_, i) => (
          <div
            key={i}
            className={`w-[19rem] shrink-0 overflow-hidden rounded-2xl border border-[#e3ece5] bg-white md:w-auto dark:border-gray-700 dark:bg-gray-900 ${
              i === 2 ? 'md:hidden xl:block' : ''
            }`}
          >
            <div className="flex items-start gap-3 p-4">
              <div className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="h-3 w-1/3 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="h-4 w-1/2 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#eef3ef] bg-[#f7faf6] px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex -space-x-2">
                {Array.from({length: 3}).map((__, j) => (
                  <span
                    key={j}
                    className="h-7 w-7 animate-pulse rounded-full border-2 border-white bg-gray-200 dark:border-gray-800 dark:bg-gray-700"
                  />
                ))}
              </div>
              <div className="h-3 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
