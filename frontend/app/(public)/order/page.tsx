'use client';

import LocationPicker from '@/features/order/components/LocationPicker';
import {useMemo, useState} from 'react';
import Image from 'next/image';
import {Input} from '@/components/ui/input';
import {Search} from 'lucide-react';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import type {Product} from '@/lib/types/product';
import MenuCard from '@/shared/components/MenuCard';
import {useLocationStore} from '@/app/store/locationStore';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import type {Promo} from '@/lib/types/promo';
import {
  getBundleBadge,
  getPromoBadgeForProduct
} from '@/lib/utils/promoPricing';

function ProductsSection() {
  const {data, isLoading, isError} = useProductsQuery();
  const promosQuery = usePublicPromosQuery();
  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data?.promos]
  );

  const availableProducts = useMemo(() => {
    return products.filter(p => p.isAvailable && p.stock > 0);
  }, [products]);

  const promoBundles = useMemo(() => {
    return promos.filter(
      (p): p is Promo & {price: number} =>
        p.promoType === 'bundle' && typeof p.price === 'number'
    );
  }, [promos]);

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
      ...(promoBundles.length > 0
        ? [{id: 'promoBundles', label: 'Promo Bundles', category: null}]
        : []),
      ...categories.map(category => ({
        id: category.toLowerCase().replace(/\s+/g, ''),
        label: category,
        category
      }))
    ];
  }, [availableProducts, promoBundles.length]);

  const [activeTab, setActiveTab] = useState('featured');
  const [query, setQuery] = useState('');

  const featuredItems = useMemo(() => {
    return availableProducts.slice(0, 5);
  }, [availableProducts]);

  const activeCategory = useMemo(() => {
    if (activeTab === 'featured') return null;
    if (activeTab === 'promoBundles') return null;
    return tabs.find(t => t.id === activeTab)?.category ?? null;
  }, [activeTab, tabs]);

  const visibleItems = useMemo(() => {
    if (activeTab === 'promoBundles') {
      const normalizedQuery = query.trim().toLowerCase();
      const filtered = normalizedQuery
        ? promoBundles.filter(p =>
            p.title.toLowerCase().includes(normalizedQuery)
          )
        : promoBundles;
      return filtered.slice(0, 5).map(p => ({
        id: p._id,
        name: p.title,
        price: p.price,
        imageUrl: p.imageUrl,
        note: p.description,
        href: `/order/promo/${encodeURIComponent(p._id)}`
      }));
    }

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

    return filtered.slice(0, 5).map(item => ({
      id: item._id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      note: item.description,
      href: undefined as string | undefined
    }));
  }, [
    activeCategory,
    activeTab,
    availableProducts,
    featuredItems,
    promoBundles,
    query
  ]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="w-full rounded-2xl overflow-hidden mb-10 mt-12 bg-[#3c5e45]">
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
              : (tabs.find(t => t.id === activeTab)?.label ?? 'Products')}
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
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                imageUrl={item.imageUrl}
                note={item.note}
                basePath="order"
                href={item.href}
                badge={
                  activeTab === 'promoBundles'
                    ? {
                        label: getBundleBadge()?.label ?? 'BUNDLE',
                        variant: 'bundle'
                      }
                    : (() => {
                        const b = getPromoBadgeForProduct({
                          promos,
                          productId: item.id
                        });
                        return b
                          ? {label: b.label, variant: 'promo'}
                          : undefined;
                      })()
                }
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function OrderPage() {
  const savedLocation = useLocationStore(s => s.location);
  const setSavedLocation = useLocationStore(s => s.setLocation);

  const shouldShowLocationPicker = !savedLocation;

  return (
    <div className="min-h-screen">
      {shouldShowLocationPicker && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <LocationPicker
            onConfirm={loc => {
              setSavedLocation(loc);
            }}
          />
        </div>
      )}

      {!shouldShowLocationPicker && <ProductsSection />}
    </div>
  );
}
