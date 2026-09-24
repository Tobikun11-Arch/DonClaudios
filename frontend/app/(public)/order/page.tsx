'use client';

import {useEffect, useMemo, useState} from 'react';
import Image from 'next/image';
import {Input} from '@/components/ui/input';
import {Search, History, SlidersHorizontal} from 'lucide-react';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import MenuCategoryCard from '@/shared/components/MenuCategoryCard';
import FeaturedMenuItemCard from '@/shared/components/FeaturedMenuItemCard';
import MenuCardSkeleton from '@/shared/components/MenuCardSkeleton';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import type {Promo} from '@/lib/types/promo';
import Link from 'next/link';
import {useCartStore} from '@/app/store/cartStore';
import {useCartUiStore} from '@/app/store/cartUiStore';

import {
  getBundleBadge,
  getPromoBadgeForProduct
} from '@/lib/utils/promoPricing';
import StoreClosedModal from '@/shared/components/StoreClosedModal';
import {getGuestOrderHistory, subscribeGuestOrderHistory} from '@/lib/orders/orderHistoryStorage';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';

function ProductsSection() {
  const {data, isLoading, isError} = useProductsQuery();
  const promosQuery = usePublicPromosQuery();
  const [guestOrders, setGuestOrders] = useState<OrderHistoryEntry[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeGuestOrderHistory(() =>
      setGuestOrders(getGuestOrderHistory())
    );
    const rafId = requestAnimationFrame(() =>
      setGuestOrders(getGuestOrderHistory())
    );
    return () => {
      unsubscribe();
      cancelAnimationFrame(rafId);
    };
  }, []);
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

    const rice = categories.find(c => /rice/i.test(c)) ?? null;

    return [
      ...(rice
        ? [
            {
              id: rice.toLowerCase().replace(/\s+/g, ''),
              label: rice,
              category: rice
            }
          ]
        : []),
      ...(promoBundles.length > 0
        ? [{id: 'promoBundles', label: 'Promo Bundles', category: null}]
        : []),
      ...categories
        .filter(c => c !== rice)
        .map(category => ({
          id: category.toLowerCase().replace(/\s+/g, ''),
          label: category,
          category
        }))
    ];
  }, [availableProducts, promoBundles.length]);

  const defaultTabId = useMemo(() => {
    return (
      tabs.find(t => t.category && /rice/i.test(t.category))?.id ??
      tabs.find(t => t.category)?.id ??
      tabs[0]?.id ??
      ''
    );
  }, [tabs]);

  const [activeTab, setActiveTab] = useState('');
  const [query, setQuery] = useState('');

  const resolvedActiveTab = tabs.some(t => t.id === activeTab)
    ? activeTab
    : defaultTabId;

  const activeOrderCount = useMemo(
    () =>
      guestOrders.filter(
        order =>
          order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled'
      ).length,
    [guestOrders]
  );

  const activeCategory = useMemo(() => {
    if (resolvedActiveTab === 'promoBundles') return null;
    return tabs.find(t => t.id === resolvedActiveTab)?.category ?? null;
  }, [resolvedActiveTab, tabs]);

  const visibleItems = useMemo(() => {
    if (resolvedActiveTab === 'promoBundles') {
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

    const sourceItems = availableProducts.filter(
      p => p.category === activeCategory
    );

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

    availableProducts,

    promoBundles,

    query,

    resolvedActiveTab
  ]);

  const addItem = useCartStore(s => s.addItem);
  const openCart = useCartUiStore(s => s.open);

  const handleAdd = (item: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  }) => {
    addItem({
      productId: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      qty: 1
    });
    openCart();
  };

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

      <div className='flex justify-between'>
        <h1 className="text-2xl font-bold mb-2">DonClaudios Menu</h1>
      <Link
        href="/order-history"
        aria-label="Order history"
        className="relative inline-flex items-center rounded-full p-2 hover:bg-[#2d4a35]/10 transition-colors -mt-1"
      >
        <span className="relative inline-block">
          <History className="h-6 w-6 text-[#2d4a35]" />
          {activeOrderCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 h-6 min-w-6 px-1.5 rounded-full bg-[#c30010] text-white text-xs font-bold grid place-items-center">
              {activeOrderCount}
            </span>
          )}
        </span>
      </Link>
      </div>

      <section className="mb-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Filters"
            className="shrink-0 grid place-items-center w-11 h-11 rounded-xl bg-[#2d4a35] text-white hover:bg-[#3c5e45] transition-colors"
          >
            <SlidersHorizontal size={20} />
          </button>

          <div className="relative flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search"
              className="pl-11 h-11 rounded-full border-0 bg-[#F5F5F5] text-gray-800 focus-visible:ring-2 focus-visible:ring-[#2d4a35]/40"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-4 overflow-x-auto scrollbar-none -mx-4 px-4 md:flex-wrap md:overflow-visible md:mx-0 md:px-0">
          {tabs.map(tab => (
            <MenuCategoryCard
              key={tab.id}
              label={tab.label}
              active={tab.id === resolvedActiveTab}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-[22px] font-bold text-gray-900">
            {tabs.find(t => t.id === resolvedActiveTab)?.label ?? 'Products'}
          </h2>

          <p className="text-sm text-gray-500 mt-0.5 mb-24">Browse items</p>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({length: 5}).map((_, i) => (
                <MenuCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="text-sm text-gray-500">Failed to load products.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visibleItems.map(item => (
                <FeaturedMenuItemCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  price={item.price}
                  imageUrl={item.imageUrl}
                  note={item.note}
                  basePath="order"
                  href={item.href}
                  badge={
                    resolvedActiveTab === 'promoBundles'
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
                  onAdd={() => handleAdd(item)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function OrderPage() {
  return (
    <div className="min-h-screen">
      <StoreClosedModal />
      <ProductsSection />
    </div>
  );
}
