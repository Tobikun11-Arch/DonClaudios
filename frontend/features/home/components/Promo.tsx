'use client';

import {Button} from '@/components/ui/button';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import type {Promo} from '@/lib/types/promo';
import Image from 'next/image';
import {useMemo, useRef, useState} from 'react';

function PromoCardImage({promo}: {promo: Promo}) {
  const [loaded, setLoaded] = useState(!promo.imageUrl);
  const isUpcoming = useMemo(() => {
    const start = new Date(promo.startDate);
    if (Number.isNaN(start.getTime())) return false;
    return new Date() < start;
  }, [promo.startDate]);

  return (
    <div className="relative h-64 bg-gray-100">
      {promo.imageUrl ? (
        <Image
          draggable={false}
          src={promo.imageUrl}
          alt={promo.title}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 90vw, 380px"
          className="object-cover"
          unoptimized
          onLoad={() => setLoaded(true)}
        />
      ) : null}
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      ) : null}

      {isUpcoming ? (
        <div className="absolute top-6 left-6 bg-blue-600 text-white px-4 py-2 rounded-full font-bold text-sm">
          UPCOMING
        </div>
      ) : (
        <div className="absolute top-6 left-6 bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm">
          LIMITED OFFER
        </div>
      )}
    </div>
  );
}

function PromoCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl border overflow-hidden shrink-0 w-95">
      <div className="h-64 bg-gray-100 animate-pulse" />
      <div className="p-6 flex flex-col h-60">
        <div className="h-6 w-2/3 bg-gray-100 animate-pulse rounded" />
        <div className="mt-3 h-4 w-full bg-gray-100 animate-pulse rounded" />
        <div className="mt-2 h-4 w-5/6 bg-gray-100 animate-pulse rounded" />
        <div className="mt-auto h-12 w-full bg-gray-100 animate-pulse rounded" />
      </div>
    </div>
  );
}

export default function PromoSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const promosQuery = usePublicPromosQuery();
  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data]
  );

  const onMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    startX.current = e.pageX - scrollRef.current!.offsetLeft;
    scrollLeft.current = scrollRef.current!.scrollLeft;
  };

  const onMouseLeave = () => {
    isDown.current = false;
  };
  const onMouseUp = () => {
    isDown.current = false;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current!.scrollLeft = scrollLeft.current - walk;
  };

  const onOrderClick = () => {
    // handle order click
  };

  const items = promos;

  return (
    <section
      id="promo"
      className="min-h-screen flex items-center py-20 px-4 bg-[#fbd897]"
    >
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-5xl font-bold mb-4 text-3c5e45">Special Deals</h2>
          <p className="text-xl text-3c5e45">
            Check out our latest promos and save on your favorite lechon!
          </p>
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="overflow-x-auto pb-8 scrollbar-hide">
            <div
              ref={scrollRef}
              className="overflow-x-auto pb-8 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
              onMouseDown={onMouseDown}
              onMouseLeave={onMouseLeave}
              onMouseUp={onMouseUp}
              onMouseMove={onMouseMove}
            >
              <div className="flex gap-6 w-max">
                {promosQuery.isLoading
                  ? Array.from({length: 4}).map((_, idx) => (
                      <PromoCardSkeleton key={idx} />
                    ))
                  : null}

                {!promosQuery.isLoading
                  ? items.map((promo: Promo) => (
                      <div
                        key={promo._id}
                        className="relative bg-white rounded-3xl border overflow-hidden shrink-0 w-95"
                      >
                        <PromoCardImage promo={promo} />
                        <div className="p-6 flex flex-col h-60">
                          <h3 className="text-xl font-bold mb-2 text-3c5e45">
                            {promo.title}
                          </h3>
                          {promo.description ? (
                            <p className="text-base mb-4 grow text-a4bbab">
                              {promo.description}
                            </p>
                          ) : null}
                          <Button
                            onClick={onOrderClick}
                            className="w-full py-3 mt-auto bg-[#3c5e45] text-white"
                          >
                            Claim This Offer
                          </Button>
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-3c5e45">← Scroll to see more offers →</p>
          </div>
        </div>
      </div>
    </section>
  );
}
