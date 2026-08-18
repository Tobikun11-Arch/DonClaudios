'use client';

import Image from 'next/image';
import {DEFAULT_SETTINGS} from '@/features/owner/appearance/constants';
import type {HighlightsSection, Colors} from '@/lib/types/settings';

interface Props {
  highlights?: HighlightsSection;
  colors?: Colors;
}

export default function HighlightsSection({
  highlights = DEFAULT_SETTINGS.highlights,
  colors
}: Props) {
  const c = colors ?? DEFAULT_SETTINGS.colors;

  return (
    <section
      id="highlights"
      className="min-h-screen flex items-center py-20 px-4"
      style={{backgroundColor: c.backgroundColor}}
    >
      <div className="container mx-auto">
        <div className="max-w-2xl mb-12">
          <h2
            className="text-5xl font-bold mb-4"
            style={{color: c.primary}}
          >
            {highlights.title}
          </h2>
          <p className="text-xl text-[#a4bbab]">
            {highlights.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl h-125">
            <div className="absolute inset-0 transition-transform duration-700 scale-105">
              <Image
                src={images[0]?.url ?? '/assets/highlights1.JPG'}
                alt={images[0]?.alt ?? 'Restaurant Interior'}
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent flex items-end p-8">
              <div className="text-white">
                <h3 className="text-3xl font-bold mb-2">Lechon House</h3>
                <p className="text-lg text-white/90">
                  Located in Daang Amaya, Tanza Cavite
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl h-60 group">
              <div className="absolute inset-0 transition-transform duration-700 scale-105">
                <Image
                  src={images[1]?.url ?? '/assets/Highlight2.png'}
                  alt={images[1]?.alt ?? 'Dining Area'}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/40 flex items-end p-6">
                <h3 className="text-white text-xl font-bold">
                  Walkin&apos; Order
                </h3>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl h-60 group">
              <div className="absolute inset-0 transition-transform duration-700 scale-105">
                <Image
                  src={images[2]?.url ?? '/assets/Highlights3.png'}
                  alt={images[2]?.alt ?? 'Our Specialty'}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/40 flex items-end p-6">
                <h3 className="text-white text-xl font-bold">
                  Crispy Perfection
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
