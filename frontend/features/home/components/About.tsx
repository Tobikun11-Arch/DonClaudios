'use client';

import Image from 'next/image';
import type {AboutStat} from '@/lib/types/settings';

type AboutSectionProps = {
  title?: string;
  description?: string;
  stats?: AboutStat[];
  isLoading?: boolean;
};

function AboutSectionSkeleton() {
  return (
    <section className="min-h-screen flex items-center py-20 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="h-12 w-48 bg-gray-200 animate-pulse rounded-lg" />
            <div className="space-y-3">
              <div className="h-5 w-full bg-gray-200 animate-pulse rounded" />
              <div className="h-5 w-full bg-gray-200 animate-pulse rounded" />
              <div className="h-5 w-3/4 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="h-24 bg-gray-200 animate-pulse rounded-2xl" />
              <div className="h-24 bg-gray-200 animate-pulse rounded-2xl" />
            </div>
          </div>
          <div className="h-150 bg-gray-200 animate-pulse rounded-3xl" />
        </div>
      </div>
    </section>
  );
}

export default function AboutSection({
  title = 'Our Story',
  description = '',
  stats = [],
  isLoading = false
}: AboutSectionProps) {
  if (isLoading) return <AboutSectionSkeleton />;

  const paragraphs = description.split('\n').filter(Boolean);

  return (
    <section
      id="about"
      className="min-h-screen flex items-center py-20 px-4 bg-white"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-5xl font-bold text-[#3c5e45]">{title}</h2>
            <div className="space-y-4 text-lg text-[#3c5e45]">
              {paragraphs.length > 0 ? (
                paragraphs.map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <>
                  <p>
                    <strong>DonClaudio&apos;s Lechon House </strong> has been
                    serving Tanza, Cavite with authentic Filipino lechon for
                    years. We&apos;re passionate about bringing families together
                    with food that celebrates our rich culinary heritage.
                  </p>
                  <p>
                    Every lechon is carefully prepared using time-honored recipes
                    and slow-roasted over open flames to achieve that perfect
                    balance of crispy skin and succulent meat. We source only the
                    finest ingredients because your celebrations deserve nothing
                    less.
                  </p>
                  <p>
                    From intimate family dinners to grand fiestas,
                    DonClaudio&apos;s has been part of countless memorable
                    moments. Let us be part of yours.
                  </p>
                </>
              )}
            </div>

            {stats.length > 0 && (
              <div className="grid grid-cols-2 gap-4 pt-4">
                {stats.map((stat, i) => (
                  <div
                    key={i}
                    className={`p-6 rounded-2xl ${
                      i % 2 === 0 ? 'bg-[#fbd897]' : 'bg-[#a4bbab]'
                    }`}
                  >
                    <p
                      className={`text-3xl font-bold mb-1 ${
                        i % 2 === 0 ? 'text-[#3c5e45]' : 'text-white'
                      }`}
                    >
                      {stat.value}
                    </p>
                    <p
                      className={`text-sm ${
                        i % 2 === 0 ? 'text-[#3c5e45]' : 'text-white'
                      }`}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl" />
            <div className="relative w-full h-150 rounded-3xl overflow-hidden">
              <Image
                src="/assets/ourstory.JPG"
                alt="About DonClaudio's"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
