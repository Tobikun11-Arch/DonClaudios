'use client';

import {useRef, useState, useEffect} from 'react';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import RelatedProductCard from './RelatedProductCard';
import RelatedProductCardSkeleton from './RelatedProductCardSkeleton';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {isPreOrderProduct} from '@/lib/preOrder/preOrder';

/** "You may also like" only suggests from these categories (agreed with the advisor). */
const SUGGESTED_CATEGORIES = ['rice meals', 'appetizers', 'drinks'];

function RelatedProductsCarousel({
  currentProductId,
  basePath = ''
}: {
  categoryName: string;
  currentProductId: string;
  basePath?: string;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const {data, isLoading} = useProductsQuery();
  const products = data?.products ?? [];

  const relatedProducts = (() => {
    const now = new Date();

    // Only easy add-ons to an order: Rice Meals, Appetizers and Drinks. Never
    // lechon, platters or other big-ticket / advance-notice items.
    const orderable = products.filter(p => {
      if (p._id === currentProductId) return false;
      if (!p.isAvailable || p.stock <= 0) return false;
      if (!SUGGESTED_CATEGORIES.includes(p.category?.trim().toLowerCase())) return false;
      // Pre-orders and anything that needs hours of notice are not impulse buys.
      if (isPreOrderProduct(p) || p.preOrderOnly) return false;
      if (typeof p.minNoticeHours === 'number' && p.minNoticeHours > 0) return false;
      // Filter out products with expired embedded promos
      if (
        p.isPromoActive &&
        p.promoEndDate &&
        new Date(p.promoEndDate) < now &&
        (!p.promoStartDate || new Date(p.promoStartDate) < now)
      ) {
        return false;
      }
      return true;
    });

    // Take turns across the three categories (rice meal, appetizer, drink,
    // rice meal, ...) so the row is a mix, up to 6 cards.
    const queues = SUGGESTED_CATEGORIES.map(cat =>
      orderable.filter(p => p.category.trim().toLowerCase() === cat)
    );
    const picked: typeof orderable = [];
    for (let round = 0; picked.length < 6 && queues.some(q => q.length > round); round++) {
      for (const q of queues) {
        if (picked.length >= 6) break;
        if (q[round]) picked.push(q[round]);
      }
    }
    return picked;
  })();

  // Check scroll position to enable/disable arrows
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth
    );
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    checkScroll();
    container.addEventListener('scroll', checkScroll);
    return () => container.removeEventListener('scroll', checkScroll);
  }, [relatedProducts]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = 216; // card width (200px) + gap (16px)
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Hide section if no related products and not loading
  if (!isLoading && relatedProducts.length === 0) {
    return null;
  }

  // Show skeletons while loading
  if (isLoading) {
    return (
      <div className="mt-12">
        <div className="flex items-center justify-between mb-0">
          <div>
            <h2 className="text-[22px] font-bold text-gray-900 dark:text-gray-100">
              You may also like
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-400">
              Rice meals, appetizers and drinks
            </p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pt-16 pb-8 px-1">
          {Array.from({length: 4}).map((_, i) => (
            <RelatedProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Check if content overflows (for arrow visibility)
  const hasOverflow = relatedProducts.length > 4; // Desktop shows ~4 cards

  return (
    <div className="mt-16">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[22px] font-bold text-gray-900 dark:text-gray-100">
            You may also like
          </h2>
          <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-400">Rice meals, appetizers and drinks</p>
        </div>
        {hasOverflow && (
          <div className="hidden md:flex gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="h-10 w-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="h-10 w-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pt-16 pb-8 px-1"
      >
        {relatedProducts.map(product => (
          <RelatedProductCard
            key={product._id}
            id={product._id}
            name={product.name}
            price={product.price}
            imageUrl={product.imageUrl}
            description={product.description}
            basePath={basePath}
          />
        ))}
      </div>
    </div>
  );
}

export default RelatedProductsCarousel;
