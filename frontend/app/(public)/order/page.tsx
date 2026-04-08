'use client';

import LocationPicker from '@/features/order/components/LocationPicker';
import {useState} from 'react';
import {LocationState} from '@/features/order/components/LocationPicker';
import Image from 'next/image';

// ─── Categories ──────────────────────────────────────────────────────────────

const categories = [
  {id: 'appetizers', label: 'Appetizers'},
  {id: 'riceMeals', label: 'Rice Meals'},
  {id: 'pasta', label: 'Pasta'},
  {id: 'drinks', label: 'Drinks'}
];

const menuSections = [
  {
    id: 'appetizers',
    title: 'Appetizers',
    subtitle: 'Start your meal right.',
    items: [
      {name: 'Beef Salad', price: 175},
      {name: 'Chicken Fingers', price: 160},
      {name: 'Chicken Salad', price: 165},
      {name: 'Nachos', price: 170}
    ]
  },
  {
    id: 'riceMeals',
    title: 'Rice Meals',
    subtitle: 'Comes with a cup of rice.',
    items: [
      {name: 'Tapsilog', price: 130},
      {name: 'BulaklakSilog', price: 130},
      {name: 'ChickenSilog', price: 140},
      {name: 'LiempoSilog', price: 155}
    ]
  },
  {
    id: 'pasta',
    title: 'Pasta',
    subtitle: 'Comes with toasted bread.',
    items: [
      {name: 'Carbonara', price: 155},
      {name: 'Charlie Chan', price: 155},
      {name: 'Aglio Olio', price: 165},
      {name: 'Spaghetti', price: 165}
    ]
  },
  {
    id: 'drinks',
    title: 'Drinks',
    subtitle: 'Refreshing beverages.',
    items: [
      {
        name: 'Refreshing Pitchers',
        price: 120
      },
      {name: 'Soda in Can', price: 70}
    ]
  }
];

function MenuCard({
  name,
  price,
  note
}: {
  name: string;
  price: number;
  note?: string;
}) {
  return (
    <div className="shrink-0 w-64 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      {/* Image */}
      <div className="w-full h-64 flex items-center justify-center ">
        <Image
          src="/assets/sample_menu.png"
          alt={name}
          width={320}
          height={320}
          className="object-contain"
        />
      </div>

      {/* Content */}
      <div className="px-4 py-3"> 
        <p className="text-[14px] text-gray-800 font-medium leading-snug line-clamp-2 min-h-10">
          {name}
        </p>

        {note && (
          <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{note}</p>
        )}

        <p className="text-[15px] font-bold text-gray-900 mt-3">₱{price}.00</p>
      </div>
    </div>
  );
}

function ProductsSection() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* ─── HERO ───────────────────────── */}
      <div
        className="w-full rounded-2xl overflow-hidden mb-10 mt-12"
        style={{background: '#3c5e45'}}
      >
        <div className="flex items-center justify-between px-8 py-8">
          <div>
            <p className="text-[#fbd897] text-[11px] uppercase mb-2">
              Now Serving
            </p>
            <h1 className="text-white text-3xl font-bold">
              DonClaudio&apos;s
              <span className="block text-[#fbd897]">Lechon House</span>
            </h1>
            <p className="text-white/60 text-sm mt-2">
              Enjoy your meal with a smile!
            </p>
          </div>
          <div className="hidden sm:block w-40 h-40">
            <Image
              src="/assets/logo.png"
              alt="logo"
              width={160}
              height={160}
              className="rounded-xl object-cover"
            />
          </div>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-[22px] font-bold text-gray-900">Good Morning!</h2>
        <p className="text-sm text-gray-500 mt-0.5 mb-4">
          Enjoy your meal with our best picks!
        </p>

        <div className="flex gap-4 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2">
          {[
            ...menuSections[0].items.slice(0, 1),
            ...menuSections[1].items.slice(0, 1),
            ...menuSections[2].items.slice(0, 1),
            ...menuSections[3].items.slice(0, 1)
          ].map(item => (
            <MenuCard key={item.name} {...item} />
          ))}
        </div>
      </section>

      {/* ─── MENU (CIRCLE CATEGORIES) ───────────────────────── */}
      <section className="mb-10">
        <h2 className="text-[22px] font-bold text-gray-900">Menu</h2>
        <p className="text-sm text-gray-500 mt-0.5 mb-4">
          What are you craving for today?
        </p>

        <div className="flex gap-6 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
            >
              <div className="w-28 h-28 rounded-full bg-[#3c5e45] flex items-center justify-center shadow-sm">
                <Image
                  src="/assets/sample_menu.png"
                  alt={cat.label}
                  width={200}
                  height={200}
                  className="object-contain"
                />
              </div>
              <span className="text-xs text-gray-700 font-medium text-center">
                {cat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURED ───────────────────────── */}
      <section className="mb-10">
        <h2 className="text-[22px] font-bold text-gray-900">Featured</h2>
        <p className="text-sm text-gray-500 mt-0.5 mb-4">
          Discover your favorites!
        </p>

        <div className="flex gap-4 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2">
          {menuSections[0].items.slice(0, 4).map(item => (
            <MenuCard key={item.name} {...item} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OrderPage() {
  const [isProductsVisible, setIsProductsVisible] = useState(false);
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    address: ''
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {!isProductsVisible && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <LocationPicker
            onConfirm={loc => {
              setIsProductsVisible(true);
              setLocation(loc);
            }}
          />
        </div>
      )}

      {isProductsVisible && <ProductsSection />}
    </div>
  );
}
