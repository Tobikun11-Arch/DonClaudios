'use client';

import LocationPicker from '@/features/order/components/LocationPicker';
import {useMemo, useState} from 'react';
import {LocationState} from '@/features/order/components/LocationPicker';
import Image from 'next/image';
import {Input} from '@/components/ui/input';
import {Search} from 'lucide-react';

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
  const tabs = [
    {id: 'featured', label: 'Featured'},
    {id: 'appetizers', label: 'Appetizers'},
    {id: 'riceMeals', label: 'Rice Meals'},
    {id: 'pasta', label: 'Pasta'},
    {id: 'drinks', label: 'Drinks'}
  ] as const;

  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]['id']>('featured');
  const [query, setQuery] = useState('');

  const featuredItems = useMemo(() => {
    return [
      ...menuSections[0].items.slice(0, 2),
      ...menuSections[1].items.slice(0, 1),
      ...menuSections[2].items.slice(0, 1),
      ...menuSections[3].items.slice(0, 1)
    ].slice(0, 5);
  }, []);

  const activeSection = useMemo(() => {
    if (activeTab === 'featured') return null;
    return menuSections.find(s => s.id === activeTab) ?? null;
  }, [activeTab]);

  const visibleItems = useMemo(() => {
    const sourceItems =
      activeTab === 'featured' ? featuredItems : (activeSection?.items ?? []);

    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? sourceItems.filter(item =>
          item.name.toLowerCase().includes(normalizedQuery)
        )
      : sourceItems;

    return filtered.slice(0, 5);
  }, [activeSection?.items, activeTab, featuredItems, query]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
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
      <h1 className="text-2xl font-bold mb-2">DonClaudios Menu</h1>

      <section className="mb-10">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full md:w-64">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search menu"
                aria-label="Search menu"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2">
            {tabs.map(tab => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ' +
                    (isActive
                      ? 'bg-[#c30010] text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50')
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-[22px] font-bold text-gray-900">
            {activeTab === 'featured' ? 'Featured' : activeSection?.title}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5 mb-4">
            {activeTab === 'featured'
              ? 'Discover your favorites!'
              : activeSection?.subtitle}
          </p>

          <div className="flex gap-4 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2">
            {visibleItems.map(item => (
              <MenuCard key={item.name} {...item} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

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
