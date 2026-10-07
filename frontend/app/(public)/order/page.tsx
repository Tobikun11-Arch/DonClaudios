'use client';

import {useMemo, useState} from 'react';
import Image from 'next/image';
import {Input} from '@/components/ui/input';
import {Search, History, SlidersHorizontal} from 'lucide-react';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import MenuCategoryCard from '@/shared/components/MenuCategoryCard';
import FeaturedMenuItemCard from '@/shared/components/FeaturedMenuItemCard';
import MenuCardSkeleton from '@/shared/components/MenuCardSkeleton';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {usePublicCategoriesQuery} from '@/lib/hooks/categories/useCategories';
import type {Promo} from '@/lib/types/promo';
import Link from 'next/link';
import {toast} from 'sonner';
import {useCartStore} from '@/app/store/cartStore';
import {useCartUiStore} from '@/app/store/cartUiStore';

import {
  getBundleBadge,
  getPromoBadgeForProduct
} from '@/lib/utils/promoPricing';
import StoreClosedModal from '@/shared/components/StoreClosedModal';
import {
  isPreOrderProduct,
  preOrderClosedMessage,
  preOrderDisplay,
  preOrderLimitMessage
} from '@/lib/preOrder/preOrder';
import {useGuestOrders} from '@/lib/hooks/orders/useGuestOrders';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {
  buildFeaturedMenuItems,
  FEATURED_TAB_ID,
  FEATURED_TAB_IMAGE,
  FEATURED_TAB_LABEL
} from '@/lib/menu/featured';

function ProductsSection() {
  const {data, isLoading, isError} = useProductsQuery();
  const promosQuery = usePublicPromosQuery();
  const publicCategoriesQuery = usePublicCategoriesQuery();
  const guestOrders = useGuestOrders();
  const {data: me} = useMeQuery();

  // Featured mixes pre-orders in, and guests cannot see or order those, so
  // the tab is hidden for them entirely rather than shown with gaps.
  const isSignedIn = !!me;

  const products = useMemo(() => data?.products ?? [], [data?.products]);

  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data?.promos]
  );

  const categoryImageMap = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const c of publicCategoriesQuery.data?.categories ?? []) {
      map[c.name] = c.imageUrl ?? undefined;
    }
    return map;
  }, [publicCategoriesQuery.data]);

  const availableProducts = useMemo(() => {
    return products.filter(p => p.isAvailable && p.stock > 0);
  }, [products]);

  const promoBundles = useMemo(() => {
    return promos.filter(
      (p): p is Promo & {price: number} =>
        p.promoType === 'bundle' && typeof p.price === 'number'
    );
  }, [promos]);

  const featuredItems = useMemo(
    () =>
      buildFeaturedMenuItems({
        products: availableProducts,
        promos,
        isSignedIn,
        basePath: 'order'
      }),
    [availableProducts, isSignedIn, promos]
  );

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
      ...(featuredItems.length > 0
        ? [{id: FEATURED_TAB_ID, label: FEATURED_TAB_LABEL, category: null}]
        : []),
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
  }, [availableProducts, featuredItems.length, promoBundles.length]);

  const defaultTabId = useMemo(() => {
    if (featuredItems.length > 0) return FEATURED_TAB_ID;

    return (
      tabs.find(t => t.category && /rice/i.test(t.category))?.id ??
      tabs.find(t => t.category)?.id ??
      tabs[0]?.id ??
      ''
    );
  }, [featuredItems.length, tabs]);

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
    if (resolvedActiveTab === FEATURED_TAB_ID) return null;
    return tabs.find(t => t.id === resolvedActiveTab)?.category ?? null;
  }, [resolvedActiveTab, tabs]);

  const visibleItems = useMemo(() => {
    if (resolvedActiveTab === FEATURED_TAB_ID) {
      const normalizedQuery = query.trim().toLowerCase();

      if (!normalizedQuery) return featuredItems;

      return featuredItems
        .filter(item => item.name.toLowerCase().includes(normalizedQuery))
        .slice(0, 5);
    }

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

        href: `/order/promo/${encodeURIComponent(p._id)}`,

        // Bundles are never pre-orders.
        isPreOrder: false,

        preOrderClosed: false,

        preOrderOrderable: true,

        preOrderLimit: null,

        preOrderStatusLine: '',

        preOrderSubLine: ''
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

    return filtered.slice(0, 5).map(item => {
      const display = preOrderDisplay(item);
      return {
        id: item._id,

        name: item.name,

        price: item.price,

        imageUrl: item.imageUrl,

        note: item.description,

        href: undefined as string | undefined,

        isPreOrder: isPreOrderProduct(item),

        preOrderClosed: display.closed,

        preOrderOrderable: display.orderable,

        preOrderLimit:
          typeof item.preOrderPurchaseLimit === 'number' &&
          item.preOrderPurchaseLimit >= 1
            ? item.preOrderPurchaseLimit
            : null,

        preOrderStatusLine: display.statusLine,

        preOrderSubLine: display.subLine
      };
    });
  }, [
    activeCategory,

    availableProducts,

    featuredItems,

    promoBundles,

    query,

    resolvedActiveTab
  ]);

  const addItem = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);
  const openCart = useCartUiStore(s => s.open);

  const handleAdd = (item: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    isPreOrder?: boolean;
    preOrderClosed?: boolean;
    preOrderOrderable?: boolean;
    preOrderLimit?: number | null;
    preOrderStatusLine?: string;
  }) => {
    // The guest cart can never hold a pre-order, but a signed-in customer
    // can reach this page — so check the batch window and limit here too
    // rather than letting the customer add an item the backend will reject.
    if (item.isPreOrder && item.preOrderClosed) {
      toast.error(preOrderClosedMessage(item.name));
      return;
    }

    if (item.isPreOrder && item.preOrderOrderable === false) {
      toast.error(
        item.preOrderStatusLine
          ? `${item.name} — ${item.preOrderStatusLine}. Please check back then.`
          : preOrderClosedMessage(item.name)
      );
      return;
    }

    if (item.isPreOrder && typeof item.preOrderLimit === 'number') {
      const currentQty =
        cartItems.find(i => i.productId === item.id)?.qty ?? 0;
      if (currentQty + 1 > item.preOrderLimit) {
        toast.error(
          preOrderLimitMessage({
            productName: item.name,
            limit: item.preOrderLimit,
            currentQty
          })
        );
        return;
      }
    }

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

        <div className="mt-5 flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 md:flex-wrap md:overflow-visible md:mx-0 md:px-0">
          {tabs.map(tab => (
            <MenuCategoryCard
              key={tab.id}
              label={tab.label}
              imageUrl={
                tab.id === FEATURED_TAB_ID
                  ? FEATURED_TAB_IMAGE
                  : categoryImageMap[tab.label]
              }
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
                  isPreOrder={item.isPreOrder}
                  preOrderClosed={item.preOrderClosed}
                  preOrderOrderable={item.preOrderOrderable}
                  preOrderLimit={item.preOrderLimit}
                  preOrderStatusLine={item.preOrderStatusLine}
                  preOrderSubLine={item.preOrderSubLine}
                  badge={
                    resolvedActiveTab === 'promoBundles' ||
                    (resolvedActiveTab === FEATURED_TAB_ID && !item.isPreOrder)
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
