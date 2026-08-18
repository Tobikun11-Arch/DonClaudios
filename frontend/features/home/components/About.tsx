'use client';

import Image from 'next/image';
import {DEFAULT_SETTINGS} from '@/features/owner/appearance/constants';
import type {AboutSection, Colors} from '@/lib/types/settings';

interface Props {
  about?: AboutSection;
  colors?: Colors;
}

export default function AboutSection({
  about = DEFAULT_SETTINGS.about,
  colors
}: Props) {
  const c = colors ?? DEFAULT_SETTINGS.colors;

  return (
    <section
      id="about"
      className="min-h-screen flex items-center py-20 px-4 bg-white"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2
              className="text-5xl font-bold"
              style={{color: c.primary}}
            >
              {about.title}
            </h2>
            <div
              className="space-y-4 text-lg"
              style={{color: c.primary}}
            >
              <p>
                <strong>DonClaudio&apos;s Lechon House </strong>
                {about.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              {about.stats.map((stat, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl"
                  style={{
                    backgroundColor: i === 0 ? c.accent : '#a4bbab'
                  }}
                >
                  <p
                    className="text-3xl font-bold mb-1"
                    style={{color: i === 0 ? c.primary : 'white'}}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-sm"
                    style={{color: i === 0 ? c.primary : 'white'}}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
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
