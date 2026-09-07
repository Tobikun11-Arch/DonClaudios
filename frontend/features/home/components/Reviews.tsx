'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';
import {Star} from 'lucide-react';
import {DEFAULT_SETTINGS} from '@/features/owner/appearance/constants';
import type {Colors, ReviewsSection as ReviewsSectionType, ReviewItem, SectionStyle} from '@/lib/types/settings';

const GRID_SIZE = 4; // 2x2

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

function Stars({rating}: {rating: number}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({length: Math.min(5, Math.max(0, rating))}).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4 fill-yellow-400 text-yellow-400"
        />
      ))}
    </div>
  );
}

function Avatar({
  name,
  profilePhoto,
  className
}: {
  name: string;
  profilePhoto?: string | null;
  className?: string;
}) {
  if (profilePhoto) {
    return (
      <Image
        src={profilePhoto}
        alt={name}
        width={40}
        height={40}
        className={`rounded-full object-cover shrink-0 bg-[#a4bbab] ${className ?? 'w-10 h-10'}`}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-[#a4bbab] flex items-center justify-center text-white text-sm font-bold shrink-0 ${className ?? 'w-10 h-10'}`}
    >
      {getInitials(name)}
    </div>
  );
}

function ReviewCard({review}: {review: ReviewItem}) {
  return (
    <div className="bg-white/80 rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col h-full">
      <Stars rating={review.rating} />

      <p className="text-gray-700 text-sm sm:text-base lg:text-lg leading-relaxed flex-1 mt-4 mb-6">
        &ldquo;{review.quote}&rdquo;
      </p>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-3">
          <Avatar name={review.name} profilePhoto={review.profilePhoto} />
          <div>
            <p className="font-bold text-gray-900 text-sm">{review.name}</p>
            <p className="text-xs text-gray-500">{review.tag}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedPanel({review}: {review: ReviewItem}) {
  const coverImage = review.images?.[0]?.url;
  return (
    <div className="relative rounded-2xl overflow-hidden h-full min-h-80 bg-[#a4bbab]">
      {coverImage ? (
        <Image
          src={coverImage}
          alt={review.name}
          fill
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-contain"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#8aab8e] to-[#6b8a6e]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg">
        <span className="text-5xl font-serif text-[#6b8a6e]/40 leading-none select-none">
          &ldquo;
        </span>
        <p className="text-sm sm:text-base text-gray-800 italic leading-relaxed -mt-2 mb-3">
          {review.quote}
        </p>
        <div className="flex items-center gap-3">
          <Avatar name={review.name} profilePhoto={review.profilePhoto} />
          <div>
            <p className="font-bold text-gray-900 text-sm">{review.name}</p>
            <p className="text-xs text-gray-500">{review.tag}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function useAutoSlide(totalPages: number, intervalMs = 4000) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, totalPages);

  useEffect(() => {
    if (pageCount <= 1) {
      return;
    }
    const id = setInterval(() => {
      setPage(prev => (prev + 1) % pageCount);
    }, intervalMs);
    return () => clearInterval(id);
  }, [pageCount, intervalMs]);

  const safePage = pageCount > 1 ? page % pageCount : 0;
  return {page: safePage, pageCount, setPage};
}

function ReviewGridCarousel({items}: {items: ReviewItem[]}) {
  const pages: (ReviewItem | null)[][] = [];
  for (let i = 0; i < items.length; i += GRID_SIZE) {
    const group: (ReviewItem | null)[] = items.slice(i, i + GRID_SIZE);
    while (group.length < GRID_SIZE) {
      group.push(null);
    }
    pages.push(group);
  }
  const {page, pageCount, setPage} = useAutoSlide(pages.length);

  const renderGroup = (group: (ReviewItem | null)[], base: number) =>
    group.map((review, i) =>
      review ? (
        <ReviewCard key={`${base}-${i}`} review={review} />
      ) : (
        <div key={`${base}-${i}`} aria-hidden="true" />
      )
    );

  const gridClasses =
    'grid sm:grid-cols-2 grid-rows-2 auto-rows-fr items-stretch gap-4 sm:gap-5 h-full';

  if (pages.length <= 1) {
    return (
      <div className={`lg:col-span-3 ${gridClasses}`}>
        {renderGroup(pages[0] ?? [], 0)}
      </div>
    );
  }

  return (
    <div className="lg:col-span-3 flex flex-col">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{transform: `translateX(-${page * 100}%)`}}
        >
          {pages.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className={`w-full shrink-0 ${gridClasses}`}
            >
              {renderGroup(group, groupIndex)}
            </div>
          ))}
        </div>
      </div>

      {pageCount > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({length: pageCount}).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                i === page
                  ? 'w-6 bg-[#2d4a35]'
                  : 'w-2.5 bg-[#2d4a35]/30 hover:bg-[#2d4a35]/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  reviews?: ReviewsSectionType;
  colors?: Colors;
  sectionStyle?: SectionStyle;
}

export default function ReviewsSection({reviews, colors, sectionStyle}: Props) {
  const c = colors ?? DEFAULT_SETTINGS.colors;
  const r = reviews ?? DEFAULT_SETTINGS.reviews;

  return (
    <section
      id="reviews"
      className="min-h-screen flex items-center py-20 px-4"
      style={{
        backgroundColor: sectionStyle?.backgroundColor || `color-mix(in srgb, ${c.primary} 12%, white)`,
        color: sectionStyle?.textColor || undefined,
        fontFamily: sectionStyle?.fontFamily || undefined,
        ...(sectionStyle?.textColor ? {'--dc-text': sectionStyle.textColor} : {})
      }}
    >
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold tracking-widest uppercase text-[#6b8a6e] mb-2">
            Testimonials
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
            style={{color: 'var(--dc-text, ' + c.primary + ')'}}
          >
            {r.heading}
          </h2>
          <p
            className="text-base sm:text-xl"
            style={{color: 'var(--dc-text, ' + c.primary + ')'}}
          >
            {r.subheading}
          </p>
        </div>

        {/* Desktop & Tablet: split layout */}
        <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-stretch">
          {/* Left: photo + featured review */}
          <div className="lg:col-span-2">
            <FeaturedPanel review={r.featured} />
          </div>

          {/* Right: 2x2 grid with auto-slide when >4 */}
          <ReviewGridCarousel items={r.items} />
        </div>

        {/* Mobile: stacked layout */}
        <div className="md:hidden space-y-5">
          <FeaturedPanel review={r.featured} />

          {r.items.map((review, i) => (
            <ReviewCard key={i} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
