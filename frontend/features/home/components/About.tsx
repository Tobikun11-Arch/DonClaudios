import React from 'react';
import Image from 'next/image';

export default function AboutSection() {
  return (
    <section
      id="about"
      className="min-h-screen flex items-center py-20 px-4 bg-white"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-5xl font-bold text-[#3c5e45]">Our Story</h2>
            <div className="space-y-4 text-lg text-[#3c5e45]">
              <p>
                <strong>DonClaudio&apos;s Lechon House </strong> has been serving
                Tanza, Cavite with authentic Filipino lechon for years.
                We&apos;re passionate about bringing families together with food
                that celebrates our rich culinary heritage.
              </p>
              <p>
                Every lechon is carefully prepared using time-honored recipes
                and slow-roasted over open flames to achieve that perfect
                balance of crispy skin and succulent meat. We source only the
                finest ingredients because your celebrations deserve nothing
                less.
              </p>
              <p>
                From intimate family dinners to grand fiestas, DonClaudio&apos;s
                has been part of countless memorable moments. Let us be part of
                yours.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-6 rounded-2xl bg-[#fbd897]">
                <p className="text-3xl font-bold mb-1 text-[#3c5e45]">100%</p>
                <p className="text-sm text-[#3c5e45]">Fresh & Quality</p>
              </div>
              <div className="p-6 rounded-2xl bg-[#a4bbab]">
                <p className="text-3xl font-bold mb-1 text-white">Daily</p>
                <p className="text-sm text-white">Roasted Fresh</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl"/>
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
