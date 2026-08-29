'use client';

import {Star} from 'lucide-react';
import {DEFAULT_SETTINGS} from '@/features/owner/appearance/constants';
import type {Colors, ReviewsSection as ReviewsSectionType, ReviewItem, SectionStyle} from '@/lib/types/settings';

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('');
}

function Stars({rating}: {rating: number}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({length: rating}).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4 fill-yellow-400 text-yellow-400"
        />
      ))}
    </div>
  );
}

function AvatarPlaceholder({initials}: {initials: string}) {
  return (
    <div className="w-10 h-10 rounded-full bg-[#a4bbab] flex items-center justify-center text-white text-sm font-bold shrink-0">
      {initials}
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
          <AvatarPlaceholder initials={getInitials(review.name)} />
          <div>
            <p className="font-bold text-gray-900 text-sm">{review.name}</p>
            <p className="text-xs text-gray-500">{review.tag}</p>
          </div>
        </div>
      </div>
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
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden min-h-80 bg-[#a4bbab]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8aab8e] to-[#6b8a6e]" />

            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg">
              <span className="text-5xl font-serif text-[#6b8a6e]/40 leading-none select-none">
                &ldquo;
              </span>
              <p className="text-sm sm:text-base text-gray-800 italic leading-relaxed -mt-2 mb-3">
                {r.featured.quote}
              </p>
              <div className="flex items-center gap-3">
                <AvatarPlaceholder initials={getInitials(r.featured.name)} />
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {r.featured.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.featured.tag}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: 2x2 grid */}
          <div className="lg:col-span-3 grid sm:grid-cols-2 auto-rows-fr gap-4 sm:gap-5">
            {r.items.map((review, i) => (
              <ReviewCard key={i} review={review} />
            ))}
          </div>
        </div>

        {/* Mobile: stacked layout */}
        <div className="md:hidden space-y-5">
          <div className="relative rounded-2xl overflow-hidden h-72 bg-[#a4bbab]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8aab8e] to-[#6b8a6e]" />

            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
              <span className="text-4xl font-serif text-[#6b8a6e]/40 leading-none select-none">
                &ldquo;
              </span>
              <p className="text-sm text-gray-800 italic leading-relaxed -mt-1 mb-3">
                {r.featured.quote}
              </p>
              <div className="flex items-center gap-3">
                <AvatarPlaceholder initials={getInitials(r.featured.name)} />
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {r.featured.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.featured.tag}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {r.items.map((review, i) => (
            <ReviewCard key={i} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
