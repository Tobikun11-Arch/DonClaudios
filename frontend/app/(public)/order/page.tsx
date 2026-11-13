'use client';

import {useMemo} from 'react';
import Link from 'next/link';
import {PackageSearch} from 'lucide-react';
import {toast} from 'sonner';
import {useBrand} from '@/lib/hooks/useBrand';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {usePublicCategoriesQuery} from '@/lib/hooks/categories/useCategories';
import {useCartStore} from '@/app/store/cartStore';
import {useCartUiStore} from '@/app/store/cartUiStore';
import StoreClosedModal from '@/shared/components/StoreClosedModal';
import {
  isPreOrderProduct,
  preOrderClosedMessage,
  preOrderDisplay,
  preOrderLimitMessage
} from '@/lib/preOrder/preOrder';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import PreOrderDatesStrip from '@/features/preorders/components/PreOrderDatesStrip';
import {MenuBrowser} from '@/features/menu/components/MenuBrowser';
import {BrandLogo} from '@/shared/components/BrandLogo';

function ProductsSection() {
  const brand = useBrand();
  const {data, isLoading, isError} = useProductsQuery();
  const promosQuery = usePublicPromosQuery();
  const publicCategoriesQuery = usePublicCategoriesQuery();
  const {data: me} = useMeQuery();
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
    // A pre-order that is fully done (no live batch and no next batch) is
    // removed from the menu. One still batching stays visible.
    const now = new Date();
    return products.filter(
      p =>
        p.isAvailable &&
        p.stock > 0 &&
        !(isPreOrderProduct(p) && preOrderDisplay(p).closed) &&
        // Filter out products with expired embedded promos (but keep upcoming ones)
        !(
          p.isPromoActive &&
          p.promoEndDate &&
          new Date(p.promoEndDate) < now &&
          // Also check if it's not upcoming (i.e., it's already passed start date)
          (!p.promoStartDate || new Date(p.promoStartDate) < now)
        )
    );
  }, [products]);

  const addItem = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);
  const openCart = useCartUiStore(s => s.open);

  const cartQtyById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of cartItems) map[i.productId] = (map[i.productId] ?? 0) + i.qty;
    return map;
  }, [cartItems]);

  const handleAdd = (item: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    isPreOrder?: boolean;
    preOrderClosed?: boolean;
    preOrderOrderable?: boolean;
    preOrderLimit?: number | null;
    preOrderAllowance?: number | null;
    preOrderOrderedToday?: number;
    preOrderStatusLine?: string;
  }) => {
    // Pre-orders are for signed-in customers only. Guests just get a prompt
    // to create or log into an account instead of a cart error.
    if (item.isPreOrder && !isSignedIn) {
      toast.error('Sign in to your customer account to order pre-orders.');
      return;
    }

    // Check the batch window and limit here too rather than letting the
    // backend reject the item at order time.
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

    if (item.isPreOrder && item.preOrderAllowance != null) {
      const currentQty = cartItems.find(i => i.productId === item.id)?.qty ?? 0;
      const orderedToday = item.preOrderOrderedToday ?? 0;
      if (currentQty + 1 > item.preOrderAllowance) {
        toast.error(
          preOrderLimitMessage({
            productName: item.name,
            limit: orderedToday + item.preOrderAllowance,
            currentQty: orderedToday + currentQty
          })
        );
        return;
      }
    } else if (item.isPreOrder && typeof item.preOrderLimit === 'number') {
      const currentQty = cartItems.find(i => i.productId === item.id)?.qty ?? 0;
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
              {brand.name}
            </h1>

            <p className="text-white/60 text-sm mt-2">
              Enjoy your meal with a smile!
            </p>
          </div>

          <div className="hidden sm:block w-40 h-40">
            <BrandLogo
              src={brand.logo}
              alt="logo"
              width={160}
              height={160}
              className="rounded-xl object-cover"
            />
          </div>
        </div>
      </div>

      <PreOrderDatesStrip signedIn={isSignedIn} />

      <MenuBrowser
        products={availableProducts}
        promos={promos}
        categoryImages={categoryImageMap}
        basePath="order"
        isLoading={isLoading}
        isError={isError}
        signedIn={isSignedIn}
        cartQtyById={cartQtyById}
        onAdd={handleAdd}
        stickyClassName="top-[72px] -mx-4 bg-white px-4"
        headerAction={
          <Link
            href="/track"
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-sm font-semibold text-[#2d4a35] transition-colors hover:bg-[#2d4a35]/5"
          >
            <PackageSearch className="h-4 w-4" />
            Track order
          </Link>
        }
      />
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
