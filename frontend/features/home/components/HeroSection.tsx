'use client';

import {Star} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {scrollToSection} from '@/shared/utils/scroll';
import {useRouter} from 'next/navigation';
import Image from 'next/image';

export default function HeroSection() {
  const router = useRouter();

  return (
    <section
      id="home"
      className="min-h-screen flex items-center p-4 pt-20 relative overflow-hidden"
      style={{backgroundColor: '#3c5e45'}}
    >
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute top-20 right-20 w-96 h-96 rounded-full blur-3xl"
          style={{backgroundColor: '#fbd897'}}
        ></div>
        <div
          className="absolute bottom-20 left-20 w-96 h-96 rounded-full blur-3xl"
          style={{backgroundColor: '#a4bbab'}}
        ></div>
      </div>

      <div className="container mx-auto relative z-10 pt-4 lg:pt-0">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="lg:space-y-8  text-white">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="ml-2 text-sm font-medium">
                Loved by locals in Tanza
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Authentic
              <br />
              Filipino
              <br />
              <span style={{color: '#fbd897'}}>Lechon</span>
            </h2>

            <p className="text-xl text-white/90 max-w-lg">
              Slow-roasted to perfection with crispy golden skin and juicy,
              tender meat. Every celebration deserves the best.
            </p>

            <div className="flex items-center gap-6 pt-4">
              <Button
                onClick={() => router.push('/order')}
                size="lg"
                className="px-8 py-6 text-lg"
                style={{backgroundColor: '#fbd897', color: '#3c5e45'}}
              >
                Place Your Order
              </Button>
              <button
                onClick={() => scrollToSection('highlights')}
                className="text-white hover:text-white/80 transition-colors font-medium"
              >
                View Promo →
              </button>
            </div>

            <div className="flex items-center gap-12 pt-6 mt-4 lg:mt-0 border-t border-white/20">
              <div>
                <p className="text-3xl font-bold" style={{color: '#fbd897'}}>
                  1000+
                </p>
                <p className="text-sm text-white/70">Happy Customers</p>
              </div>
              <div>
                <p className="text-3xl font-bold" style={{color: '#fbd897'}}>
                  Daily
                </p>
                <p className="text-sm text-white/70">Fresh Lechon</p>
              </div>
              <div>
                <p className="text-3xl font-bold" style={{color: '#fbd897'}}>
                  10 Yrs
                </p>
                <p className="text-sm text-white/70">Experience</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Image
              src="https://images.unsplash.com/photo-1671642369756-753861409c32?w=800"
              alt="Delicious Lechon"
              width={800}
              height={600}
              className="rounded-3xl shadow-2xl w-full h-[600px] object-cover"
            />
            <div className="absolute bottom-8 left-8 right-8 bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm mb-1" style={{color: '#a4bbab'}}>
                    Opening Hours
                  </p>
                  <p className="text-2xl font-bold" style={{color: '#3c5e45'}}>
                    10AM - 10PM
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm mb-1" style={{color: '#a4bbab'}}>
                    Days
                  </p>
                  <p className="font-bold" style={{color: '#3c5e45'}}>
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
