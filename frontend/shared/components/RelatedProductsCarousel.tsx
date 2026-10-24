'use client';

import {useRef, useState, useEffect} from 'react';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import RelatedProductCard from './RelatedProductCard';
import RelatedProductCardSkeleton from './RelatedProductCardSkeleton';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {isPreOrderProduct, preOrderDisplay} from '@/lib/preOrder/preOrder';

function RelatedProductsCarousel({
  categoryName,
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

    // First filter all orderable products
    const orderableProducts = products.filter(p => {
      // Exclude current product
      if (p._id === currentProductId) return false;
      // Only orderable items
      if (!p.isAvailable) return false;
      if (p.stock <= 0) return false;
      // Exclude closed pre-orders
      if (isPreOrderProduct(p) && preOrderDisplay(p).closed) return false;
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

    // Group by category
    const productsByCategory: Record<string, typeof orderableProducts> = {};
    orderableProducts.forEach(p => {
      if (!productsByCategory[p.category]) {
        productsByCategory[p.category] = [];
      }
      productsByCategory[p.category].push(p);
    });

    // Take 1 product from each category, up to 6 total
    const selectedProducts: typeof orderableProducts = [];
    for (const category in productsByCategory) {
      if (selectedProducts.length >= 6) break;
      const categoryProducts = productsByCategory[category];
      if (categoryProducts.length > 0) {
        selectedProducts.push(categoryProducts[0]);
      }
    }

    return selectedProducts;
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
            <h2 className="text-[22px] font-bold text-gray-900">
              You may also like
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              More from {categoryName}
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
          <h2 className="text-[22px] font-bold text-gray-900">
            You may also like
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Browse our menu</p>
        </div>
        {hasOverflow && (
          <div className="hidden md:flex gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="h-10 w-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="h-10 w-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
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
