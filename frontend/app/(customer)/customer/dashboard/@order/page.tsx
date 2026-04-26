'use client';

import {useMemo, useState} from 'react';
import Image from 'next/image';
import {Input} from '@/components/ui/input';
import {Search} from 'lucide-react';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import type {Product} from '@/lib/types/product';
import Link from 'next/link';

function MenuCard({
  id,
  name,
  price,
  imageUrl,
  note
}: {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  note?: string;
}) {
  return (
    <Link href={`/customer/dashboard/${encodeURIComponent(id)}`} className="shrink-0">
      <div className="w-64 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden hover:shadow-sm transition-shadow">
        <div className="w-full h-64 flex items-center justify-center">
          <Image
            src={
              imageUrl && imageUrl.length > 0
                ? imageUrl
                : '/assets/sample_menu.png'
            }
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
            <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
              {note}
            </p>
          )}

          <p className="text-[15px] font-bold text-gray-900 mt-3">
            ₱{price}.00
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function OrderSlot() {
  const {data, isLoading, isError} = useProductsQuery();
  const products = useMemo(() => data?.products ?? [], [data?.products]);

  const availableProducts = useMemo(() => {
    return products.filter(p => p.isAvailable && p.stock > 0);
  }, [products]);

  const tabs = useMemo(() => {
    const categories = Array.from(
      new Set(
        availableProducts
          .map(p => p.category)
          .filter(
            (c): c is string => typeof c === 'string' && c.trim().length > 0
          )
      )
    ).sort((a, b) => a.localeCompare(b));

    return [
      {id: 'featured', label: 'Featured', category: null as string | null},
      ...categories.map(category => ({
        id: category.toLowerCase().replace(/\s+/g, ''),
        label: category,
        category
      }))
    ];
  }, [availableProducts]);

  const [activeTab, setActiveTab] = useState('featured');
  const [query, setQuery] = useState('');

  const featuredItems = useMemo(() => {
    return availableProducts.slice(0, 5);
  }, [availableProducts]);

  const activeCategory = useMemo(() => {
    if (activeTab === 'featured') return null;
    return tabs.find(t => t.id === activeTab)?.category ?? null;
  }, [activeTab, tabs]);

  const visibleItems = useMemo(() => {
    const sourceItems: Product[] =
      activeTab === 'featured'
        ? featuredItems
        : availableProducts.filter(p => p.category === activeCategory);

    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? sourceItems.filter(item =>
          item.name.toLowerCase().includes(normalizedQuery)
        )
      : sourceItems;

    return filtered.slice(0, 5);
  }, [activeCategory, activeTab, availableProducts, featuredItems, query]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="w-full rounded-2xl overflow-hidden mb-10 bg-[#3c5e45]">
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
            {activeTab === 'featured'
              ? 'Featured'
              : tabs.find(t => t.id === activeTab)?.label ?? 'Products'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5 mb-4">
            {activeTab === 'featured'
              ? 'Discover your favorites!'
              : 'Browse items'}
          </p>

          {(isLoading || isError) && (
            <div className="text-sm text-gray-500">
              {isLoading ? 'Loading products...' : 'Failed to load products.'}
            </div>
          )}

          <div className="flex gap-4 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2">
            {visibleItems.map(item => (
              <MenuCard
                key={item._id}
                id={item._id}
                name={item.name}
                price={item.price}
                imageUrl={item.imageUrl}
                note={item.description}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
