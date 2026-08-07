'use client';

import {Star} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {scrollToSection} from '@/shared/utils/scroll';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import type {HeroStat} from '@/lib/types/settings';

type HeroSectionProps = {
  title?: string;
  highlightedWord?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  stats?: HeroStat[];
  isLoading?: boolean;
};

function HeroSectionSkeleton() {
  return (
    <section className="min-h-screen flex items-center px-4 pt-20 pb-10 relative overflow-hidden bg-[#3c5e45]">
      <div className="container mx-auto relative z-10 pt-4 lg:pt-0">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 lg:space-y-8">
            <div className="flex gap-1.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/20 animate-pulse" />
              ))}
            </div>
            <div className="space-y-3">
              <div className="h-12 sm:h-14 w-64 bg-white/20 animate-pulse rounded-lg" />
              <div className="h-12 sm:h-14 w-48 bg-white/20 animate-pulse rounded-lg" />
              <div className="h-12 sm:h-14 w-72 bg-white/20 animate-pulse rounded-lg" />
            </div>
            <div className="h-6 w-96 bg-white/20 animate-pulse rounded" />
            <div className="flex gap-4">
              <div className="h-14 w-40 bg-white/20 animate-pulse rounded-xl" />
              <div className="h-14 w-32 bg-white/20 animate-pulse rounded-xl" />
            </div>
            <div className="flex gap-12 pt-6 border-t border-white/20">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-8 w-20 bg-white/20 animate-pulse rounded" />
                  <div className="h-4 w-24 bg-white/20 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="h-75 sm:h-100 lg:h-150 bg-white/10 animate-pulse rounded-3xl" />
        </div>
      </div>
    </section>
  );
}

export default function HeroSection({
  title = 'Authentic\nFilipino',
  highlightedWord = 'Lechon',
  subtitle = 'Slow-roasted to perfection with crispy golden skin and juicy, tender meat. Every celebration deserves the best.',
  ctaText = 'Place Your Order',
  ctaLink = '/order',
  backgroundImage = '/assets/hero_image.JPG',
  stats = [],
  isLoading = false
}: HeroSectionProps) {
  const router = useRouter();

  if (isLoading) return <HeroSectionSkeleton />;

  const titleParts = title.split('\n');

  return (
    <section
      id="home"
      className="min-h-screen flex items-center px-4 pt-20 pb-10 relative overflow-hidden bg-[#3c5e45]"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full blur-3xl bg-[#fbd897]" />
        <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full blur-3xl bg-[#a4bbab]" />
      </div>

      <div className="container mx-auto relative z-10 pt-4 lg:pt-0">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 lg:space-y-8 text-white">
            <div className="flex flex-wrap items-center gap-1.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400"
                />
              ))}
              <span className="ml-1 text-xs sm:text-sm font-medium">
                Loved by locals in Tanza
              </span>
            </div>

            <h2 className="text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              {titleParts.map((part, i) => (
                <span key={i}>
                  {part}
                  {i < titleParts.length - 1 && <br />}
                </span>
              ))}
              <br />
              <span className="text-[#fbd897]">{highlightedWord}</span>
            </h2>

            <p className="text-base sm:text-xl text-white/90 max-w-lg">
              {subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={() => router.push(ctaLink)}
                size="lg"
                className="px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg bg-[#fbd897] text-[#3c5e45]"
              >
                {ctaText}
              </Button>
              <button
                onClick={() => scrollToSection('highlights')}
                className="text-white hover:text-white/80 transition-colors font-medium text-sm sm:text-base"
              >
                View Promo →
              </button>
            </div>

            {stats.length > 0 && (
              <div className="flex items-center gap-6 sm:gap-12 pt-6 border-t border-white/20">
                {stats.map((stat, i) => (
                  <div key={i}>
                    <p className="text-2xl sm:text-3xl font-bold text-[#fbd897]">
                      {stat.value}
                    </p>
                    <p className="text-xs sm:text-sm text-white/70">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <div className="relative w-full h-75 sm:h-100 lg:h-150 rounded-3xl overflow-hidden">
              <Image
                src={backgroundImage}
                alt="Delicious Lechon"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 bg-white/95 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm mb-1 text-[#a4bbab]">
                    Opening Hours
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-[#3c5e45]">
                    10AM - 10PM
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm mb-1 text-[#a4bbab]">Days</p>
                  <p className="text-sm sm:text-base font-bold text-[#3c5e45]">
                    Tue - Sun
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
