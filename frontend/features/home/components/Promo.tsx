'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function PromoSection() {
  const promos = [
    {
      id: 1,
      title: 'Weekend Feast',
      description: 'Buy 1 whole lechon and get free side dishes!',
      image: '/assets/promo1.png',
    },
    {
      id: 2,
      title: 'Family Bundle',
      description: 'Special discount for family-sized lechon orders.',
      image: '/assets/promo2.png',
    },
  ];

  const onOrderClick = () => {
    // handle order click
  };

  return (
    <section
      id="promo"
      className="min-h-screen flex items-center py-20 px-4 bg-[#fbd897]"
    >
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-5xl font-bold mb-4 text-[#3c5e45]">
            Special Deals
          </h2>
          <p className="text-xl text-[#3c5e45]">
            Check out our latest promos and save on your favorite lechon!
          </p>
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="overflow-x-auto pb-8 scrollbar-hide">
            <div className="flex gap-6 w-max">
              {promos.map(promo => (
                <div
                  key={promo.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow flex-shrink-0 w-[380px]"
                >
                  <div className="relative h-64">
                    <Image
                      src={promo.image}
                      alt={promo.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-6 left-6 bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm">
                      LIMITED OFFER
                    </div>
                  </div>
                  <div className="p-6 flex flex-col h-[240px]">
                    <h3 className="text-xl font-bold mb-2 text-[#3c5e45]">
                      {promo.title}
                    </h3>
                    {promo.description && (
                      <p className="text-base mb-4 flex-grow text-[#a4bbab]">
                        {promo.description}
                      </p>
                    )}
                    <Button
                      onClick={onOrderClick}
                      className="w-full py-3 mt-auto bg-[#3c5e45] text-white"
                    >
                      Claim This Offer
                    </Button>
                  </div>
                </div>
              ))}

              <div className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow flex-shrink-0 w-[380px]">
                <div className="relative h-64">
                  <Image
                    src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800"
                    alt="Midweek Deal"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-6 left-6 bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm">
                    LIMITED OFFER
                  </div>
                </div>
                <div className="p-6 flex flex-col h-[240px]">
                  <h3 className="text-xl font-bold mb-2 text-[#3c5e45]">
                    Midweek Special
                  </h3>
                  <p className="text-base mb-4 flex-grow text-[#a4bbab]">
                    Get 15% off on all lechon orders every Wednesday and
                    Thursday!
                  </p>
                  <Button
                    onClick={onOrderClick}
                    className="w-full py-3 mt-auto bg-[#3c5e45] text-white"
                  >
                    Claim This Offer
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow flex-shrink-0 w-[380px]">
                <div className="relative h-64">
                  <Image
                    src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"
                    alt="Party Package"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-6 left-6 bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm">
                    LIMITED OFFER
                  </div>
                </div>
                <div className="p-6 flex flex-col h-[240px]">
                  <h3 className="text-xl font-bold mb-2 text-[#3c5e45]">
                    Party Package Deal
                  </h3>
                  <p className="text-base mb-4 flex-grow text-[#a4bbab]">
                    Bundle package with free side dishes for orders above ₱5000!
                  </p>
                  <Button
                    onClick={onOrderClick}
                    className="w-full py-3 mt-auto bg-[#3c5e45] text-white"
                  >
                    Claim This Offer
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-[#3c5e45]">
              ← Scroll to see more offers →
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
