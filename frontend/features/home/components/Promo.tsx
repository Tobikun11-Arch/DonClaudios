'use client';

import {Button} from '@/components/ui/button';
import Image from 'next/image';
import {useRef} from 'react';

export default function PromoSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    startX.current = e.pageX - scrollRef.current!.offsetLeft;
    scrollLeft.current = scrollRef.current!.scrollLeft;
  };

  const onMouseLeave = () => {
    isDown.current = false;
  };
  const onMouseUp = () => {
    isDown.current = false;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current!.scrollLeft = scrollLeft.current - walk;
  };

  //change this static array promos later from database
  const promos = [
    {
      id: 1,
      title: 'Weekend Feast',
      description: 'Buy 1 whole lechon and get free side dishes!',
      image:
        'https://images.unsplash.com/photo-1764458074076-41d0cb0bf1dd?w=800'
    },
    {
      id: 2,
      title: 'Family Bundle',
      description: 'Special discount for family-sized lechon orders.',
      image:
        'https://images.unsplash.com/photo-1771161409360-e07e34e20c1b?w=800'
    },
    {
      id: 3,
      title: 'Midweek Special',
      description:
        'Get 15% off on all lechon orders every Wednesday and Thursday!',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800'
    },
    {
      id: 4,
      title: 'Party Package Deal',
      description:
        'Bundle package with free side dishes for orders above ₱5000!',
      image:
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'
    }
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
          <h2 className="text-5xl font-bold mb-4 text-3c5e45">Special Deals</h2>
          <p className="text-xl text-3c5e45">
            Check out our latest promos and save on your favorite lechon!
          </p>
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="overflow-x-auto pb-8 scrollbar-hide">
            <div
              ref={scrollRef}
              className="overflow-x-auto pb-8 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
              onMouseDown={onMouseDown}
              onMouseLeave={onMouseLeave}
              onMouseUp={onMouseUp}
              onMouseMove={onMouseMove}
            >
              <div className="flex gap-6 w-max">
                {promos.map(promo => (
                  <div
                    key={promo.id}
                    className="bg-white rounded-3xl border overflow-hidden shrink-0 w-95"
                  >
                    <div className="relative h-64">
                      <Image
                        draggable={false}
                        src={promo.image}
                        alt={promo.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-6 left-6 bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm">
                        LIMITED OFFER
                      </div>
                    </div>
                    <div className="p-6 flex flex-col h-60">
                      <h3 className="text-xl font-bold mb-2 text-3c5e45">
                        {promo.title}
                      </h3>
                      {promo.description && (
                        <p className="text-base mb-4 grow text-a4bbab">
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
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-3c5e45">← Scroll to see more offers →</p>
          </div>
        </div>
      </div>
    </section>
  );
}
