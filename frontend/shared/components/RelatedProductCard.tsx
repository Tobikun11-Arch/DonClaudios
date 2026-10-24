'use client';

import Link from 'next/link';
import Image from 'next/image';
import {ChevronRight} from 'lucide-react';

function RelatedProductCard({
  id,
  name,
  price,
  imageUrl,
  description,
  basePath = '',
  href
}: {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  basePath?: string;
  href?: string;
}) {
  const linkHref = href ?? `/${basePath}/${encodeURIComponent(id)}`;

  return (
    <Link
      href={linkHref}
      aria-label={`View ${name}`}
      className="group relative min-h-[240px] w-[200px] shrink-0 rounded-[20px] bg-white border border-gray-200 shadow-sm px-4 pt-28 pb-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c5e45]/20"
      onClick={() => window.scrollTo(0, 0)}
    >
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-14 h-[112px] w-[112px]">
        <Image
          src={
            imageUrl && imageUrl.length > 0
              ? imageUrl
              : '/assets/sample_menu.png'
          }
          alt={name}
          fill
          className="rounded-full object-cover ring-4 ring-white transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="relative z-0 pointer-events-none text-center">
        <p className="text-[18px] font-bold text-[#1a1a1a] leading-snug line-clamp-2">
          {name}
        </p>

        {description ? (
          <p className="text-[12px] text-gray-500 mt-2 leading-snug line-clamp-1 min-h-[18px]">
            {description}
          </p>
        ) : (
          <div className="min-h-[18px] mt-2" />
        )}

        <div className="mt-5 flex items-center justify-between pr-2">
          <span className="text-[17px] font-bold text-[#1a1a1a]">
            ₱{price}.00
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </Link>
  );
}

export default RelatedProductCard;
