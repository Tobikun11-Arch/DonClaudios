'use client';

import Link from 'next/link';
import Image from 'next/image';
import {Plus} from 'lucide-react';

function FeaturedMenuItemCard({
  id,
  name,
  price,
  imageUrl,
  note,
  basePath = '',
  href,
  badge,
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
  onAdd: () => void;
}) {
  const linkHref = href ?? `/${basePath}/${encodeURIComponent(id)}`;

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

      {badge ? (
        <div className="pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-[#c30010] px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-white">
          {badge.label}
        </div>
      ) : null}

      <div className="relative z-0 pointer-events-none text-center">
        <p className="text-[18px] font-bold text-[#1a1a1a] leading-snug line-clamp-2 transition-colors duration-200 group-hover:text-white group-active:text-white">
          {name}
        </p>

        {note ? (
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
        aria-label={`Add ${name} to order`}
        className="absolute bottom-6 right-4 z-10 w-10 h-10 rounded-full bg-[#fbd897] text-[#2d4a35] grid place-items-center hover:bg-white transition-colors shadow-md border border-[#2d4a35]/20"
      >
        <Plus size={20} strokeWidth={3} />
      </button>
    </div>
  );
}

export default FeaturedMenuItemCard;