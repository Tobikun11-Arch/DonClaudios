'use client';

import {Star} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {scrollToSection} from '@/shared/utils/scroll';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {DEFAULT_SETTINGS} from '@/features/owner/appearance/constants';
import type {HeroSection as HeroSectionType, Colors, SectionStyle} from '@/lib/types/settings';

interface Props {
  hero?: HeroSectionType;
  colors?: Colors;
  sectionStyle?: SectionStyle;
}

export default function HeroSection({
  hero = DEFAULT_SETTINGS.hero,
  colors,
  sectionStyle
}: Props) {
  const router = useRouter();
  const c = colors ?? DEFAULT_SETTINGS.colors;

  return (
    <section
      id="home"
      className="min-h-screen flex items-center px-4 pt-20 pb-10 relative overflow-hidden"
      style={{
        backgroundColor: sectionStyle?.backgroundColor || c.primary,
        color: sectionStyle?.textColor || '#ffffff',
        fontFamily: sectionStyle?.fontFamily || undefined,
        ...(sectionStyle?.textColor ? {'--dc-text': sectionStyle.textColor} : {})
      }}
    >
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute top-20 right-20 w-96 h-96 rounded-full blur-3xl"
          style={{backgroundColor: c.accent}}
        />
        <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full blur-3xl bg-[#a4bbab]" />
      </div>

      <div className="container mx-auto relative z-10 pt-4 lg:pt-0">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 lg:space-y-8">
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
              {hero.title}
            </h2>

            <p className="text-base sm:text-xl max-w-lg">
              {hero.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={() => router.push(hero.ctaLink)}
                size="lg"
                className="px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg"
                style={{backgroundColor: c.accent, color: c.primary}}
              >
                {hero.ctaText}
              </Button>
              <button
                onClick={() => scrollToSection('highlights')}
                className="text-white hover:text-white/80 transition-colors font-medium text-sm sm:text-base"
              >
                View Promo →
              </button>
            </div>

            <div className="flex items-center gap-6 sm:gap-12 pt-6 border-t border-white/20">
              {hero.stats.map((stat, i) => (
                <div key={i}>
                  <p
                    className="text-2xl sm:text-3xl font-bold"
                    style={{color: 'var(--dc-text, ' + c.accent + ')'}}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-xs sm:text-sm"
                    style={{color: 'var(--dc-text, rgba(255,255,255,0.7))'}}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative w-full h-75 sm:h-100 lg:h-150 rounded-3xl overflow-hidden">
              <Image
                src={hero.backgroundImage || '/assets/hero_image.JPG'}
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
                  <p
                    className="text-xl sm:text-2xl font-bold"
                    style={{color: c.primary}}
                  >
                    10AM - 10PM
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm mb-1 text-[#a4bbab]">Days</p>
                  <p
                    className="text-sm sm:text-base font-bold"
                    style={{color: c.primary}}
                  >
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
