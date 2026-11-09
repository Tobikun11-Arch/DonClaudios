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
      className={`group relative flex w-[17rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white transition-all md:w-auto ${
        event.soldOut
          ? 'border-gray-200 opacity-70'
          : 'border-[#e3ece5] hover:-translate-y-0.5 hover:border-[#2d4a35]/40 hover:shadow-lg'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-[#3c5e45] text-white">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[#fbd897]">{month}</span>
          <span className="text-2xl font-bold leading-none">{day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 pr-12 font-bold leading-snug text-gray-900">{event.title}</p>
          <p className="text-xs text-gray-500">{weekday(event.pickupDate)}</p>
          <p className="mt-1 text-sm font-semibold text-[#2d4a35]">
            {event.soldOut ? 'Fully booked' : event.fromPrice != null ? `From ${peso(event.fromPrice)}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[#eef3ef] bg-[#f7faf6] px-4 py-2.5">
        <div className="flex -space-x-2">
          {photos.map((src, i) => (
            <span key={i} className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-gray-100">
              <Image src={src} alt="" fill sizes="28px" className="object-cover" />
            </span>
          ))}
          {event.products.length > photos.length && (
            <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[#e9f5ee] text-[0.65rem] font-bold text-[#2d4a35]">
              +{event.products.length - photos.length}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-[#2d4a35]">
          {!signedIn && <Lock size={12} />}
          {full ? 'View my pre-order' : event.soldOut ? 'View' : signedIn ? 'Pre-order' : 'Sign in to order'}
          <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>

      {ordered && (
        <span className="absolute right-3 top-3 rounded-full bg-[#e9f5ee] px-2 py-0.5 text-[0.65rem] font-bold text-[#2d4a35]">
          Pre-ordered
        </span>
      )}
      {!ordered && days <= 14 && days >= 0 && !event.soldOut && (
        <span className="absolute right-3 top-3 rounded-full bg-[#fff4dd] px-2 py-0.5 text-[0.65rem] font-bold text-[#9a6400]">
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
  const {data: events = []} = useOpenPreOrders();
  if (events.length === 0) return null;

  return (
    <section className="mb-10" aria-labelledby="holiday-preorders">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="holiday-preorders" className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <CalendarHeart className="h-5 w-5 text-[#c30010]" />
            Holiday Pre-orders
          </h2>
          <p className="text-sm text-gray-500">
            Reserve your lechon for the holidays. Limited sizes and pickup slots per date.
          </p>
        </div>
      </div>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3">
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
