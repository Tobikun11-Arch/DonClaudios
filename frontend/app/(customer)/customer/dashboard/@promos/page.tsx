'use client';

import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import type {Promo} from '@/lib/types/promo';
import Image from 'next/image';
import {useMemo, useState} from 'react';

function PromoImage({promo}: {promo: Promo}) {
  const [loaded, setLoaded] = useState(false);
  const isUpcoming = useMemo(() => {
    const start = new Date(promo.startDate);
    if (Number.isNaN(start.getTime())) return false;
    return new Date() < start;
  }, [promo.startDate]);

  return (
    <div className="relative aspect-video bg-gray-100 overflow-hidden rounded-xl">
      {promo.imageUrl ? (
        <Image
          src={promo.imageUrl}
          alt={promo.title}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 90vw, 420px"
          className="object-cover"
          unoptimized
          onLoad={() => setLoaded(true)}
        />
      ) : null}
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      ) : null}

      {isUpcoming ? (
        <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full font-bold text-xs">
          UPCOMING
        </div>
      ) : null}
    </div>
  );
}

function PromoCardSkeleton() {
  return (
    <div className="border rounded-2xl bg-white overflow-hidden">
      <div className="aspect-video bg-gray-100 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-2/3 bg-gray-100 animate-pulse rounded" />
        <div className="h-4 w-full bg-gray-100 animate-pulse rounded" />
        <div className="h-4 w-5/6 bg-gray-100 animate-pulse rounded" />
      </div>
    </div>
  );
}

export default function PromoPage() {
  const promosQuery = usePublicPromosQuery();
  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data]
  );

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold">Promos</h1>
        <p className="text-sm text-gray-500">Available deals and discounts</p>
      </div>

      {promosQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length: 6}).map((_, idx) => (
            <PromoCardSkeleton key={idx} />
          ))}
        </div>
      ) : null}

      {!promosQuery.isLoading && promos.length === 0 ? (
        <div className="text-sm text-gray-500">
          No promos available right now.
        </div>
      ) : null}

      {!promosQuery.isLoading && promos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((promo: Promo) => (
            <div
              key={promo._id}
              className="border rounded-2xl bg-white overflow-hidden"
            >
              <PromoImage promo={promo} />
              <div className="p-4">
                <div className="font-semibold text-gray-900">{promo.title}</div>
                {promo.description ? (
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {promo.description}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
