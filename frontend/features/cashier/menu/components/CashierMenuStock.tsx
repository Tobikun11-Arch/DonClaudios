'use client';

import {useMemo, useState} from 'react';
import {Package, Ticket, Search, Tag} from 'lucide-react';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';

function stockClass(stock: number) {
  if (stock <= 0) return 'bg-red-50 text-red-700 border-red-200';
  if (stock <= 5) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-green-50 text-green-700 border-green-200';
}

export function CashierMenuStock() {
  const [view, setView] = useState<'products' | 'promos'>('products');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const productsQuery = useProductsQuery();
  const promosQuery = usePublicPromosQuery();

  const products = productsQuery.data?.products ?? [];
  const promos = promosQuery.data?.promos ?? [];

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map(p => p.category)))],
    [products]
  );

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      if (category !== 'all' && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [products, query, category]);

  const visiblePromos = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return promos;
    return promos.filter(
      p => p.title.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
    );
  }, [promos, query]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#2d4a35]">Menu &amp; Stock</h2>
          <p className="text-sm text-gray-500 mt-1">
            Read-only view of menu items, current stock, and promos.
          </p>
        </div>

        <div className="flex rounded-xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setView('products')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              view === 'products' ? 'bg-[#2d4a35] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package size={16} />
            Products
          </button>
          <button
            type="button"
            onClick={() => setView('promos')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              view === 'promos' ? 'bg-[#2d4a35] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Tag size={16} />
            Promos
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={view === 'products' ? 'Search menu items...' : 'Search promos...'}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8a6e]"
          />
        </div>
        {view === 'products' && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {categories.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  category === c
                    ? 'bg-[#2d4a35] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'products' ? (
        productsQuery.isLoading ? (
          <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
            Loading products...
          </div>
        ) : productsQuery.isError ? (
          <div className="rounded-2xl bg-white shadow p-5 text-sm text-red-600">
            {getFriendlyErrorMessage(productsQuery.error, 'Failed to load products')}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="rounded-2xl bg-white shadow p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {visibleProducts.map(product => (
              <div
                key={product._id}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#e9f5ee] text-[#2d4a35]">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${stockClass(product.stock)}`}
                  >
                    {product.stock > 0 ? `${product.stock} in stock` : 'Sold out'}
                  </span>
                </div>
                <p className="mt-3 font-bold text-gray-900">{product.name}</p>
                <p className="text-xs text-gray-500">{product.category}</p>
                <p className="mt-2 text-sm font-semibold text-[#2d4a35]">
                  ₱{product.price}.00
                </p>
                {!product.isAvailable && (
                  <p className="mt-2 text-[11px] font-bold text-red-600">
                    NOT AVAILABLE
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      ) : promosQuery.isLoading ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          Loading promos...
        </div>
      ) : promosQuery.isError ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-red-600">
          {getFriendlyErrorMessage(promosQuery.error, 'Failed to load promos')}
        </div>
      ) : visiblePromos.length === 0 ? (
        <div className="rounded-2xl bg-white shadow p-10 text-center">
          <Ticket className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No active promos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {visiblePromos.map(promo => (
            <div
              key={promo._id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
            >
              {promo.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={promo.imageUrl}
                  alt={promo.title}
                  className="h-32 w-full object-cover"
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-[#e9f5ee] text-[#2d4a35]">
                  <Ticket className="h-8 w-8" />
                </div>
              )}
              <div className="p-4">
                <p className="font-bold text-gray-900">{promo.title}</p>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                  {promo.description}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#2d4a35]">
                  {promo.promoType === 'percentage' && `${promo.discountRate ?? 0}% off`}
                  {promo.promoType === 'fixed_amount' && `₱${promo.discountAmount ?? 0} off`}
                  {promo.promoType === 'bundle' && promo.price ? `₱${promo.price}.00` : 'Bundle'}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  {promo.startDate
                    ? new Date(promo.startDate).toLocaleDateString()
                    : ''}{' '}
                  –{' '}
                  {promo.endDate
                    ? new Date(promo.endDate).toLocaleDateString()
                    : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}