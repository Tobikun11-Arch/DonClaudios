'use client';

import Image from 'next/image';

export default function HighlightsSection() {
  return (
    <section
      id="highlights"
      className="min-h-screen flex items-center py-20 px-4 bg-[#ffffff]"
    >
      <div className="container mx-auto">
        <div className="max-w-2xl mb-12">
          <h2 className="text-5xl font-bold mb-4 text-[#3c5e45]">
            Visit Our DonClaudio&apos;s Lechon House
          </h2>
          <p className="text-xl text-[#a4bbab]">
            Located in the heart of Tanza, Cavite. Come experience our warm
            hospitality and taste the tradition.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl h-125">
            <div className="absolute inset-0 transition-transform duration-700 scale-105 group-hover:scale-210">
              <Image
                src="/assets/Highlights1.png"
                alt="Restaurant Interior"
                width={1200}
                height={800}
                className="object-cover rounded-2xl shadow-2xl"
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
                  src="/assets/Highlights2.png"
                  alt="Dining Area"
                  width={600}
                  height={400}
                  className="object-cover rounded-2xl"
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
                  src="/assets/Highlights3.png"
                  alt="Our Specialty"
                  width={600}
                  height={400}
                  className="object-cover rounded-2xl"
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
