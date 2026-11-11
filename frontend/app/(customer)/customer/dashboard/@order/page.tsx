'use client';

import {useMemo} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {History, ShoppingCart} from 'lucide-react';
import {toast} from 'sonner';
import {useBrand} from '@/lib/hooks/useBrand';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {usePublicCategoriesQuery} from '@/lib/hooks/categories/useCategories';
import {useCartUiStore} from '@/app/store/cartUiStore';
import {
  useAddCustomerCartItemMutation,
  useCustomerCartQuery
} from '@/lib/hooks/cart/useCustomerCart';
import {useMyOrdersQuery} from '@/lib/hooks/orders/useCustomerOrder';
import {Button} from '@/components/ui/button';
import {getDiscountedUnitPrice} from '@/lib/utils/promoPricing';
import StoreClosedModal from '@/shared/components/StoreClosedModal';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  isPreOrderProduct,
  preOrderClosedMessage,
  preOrderDisplay,
  preOrderLimitMessage
} from '@/lib/preOrder/preOrder';
import PreOrderDatesStrip from '@/features/preorders/components/PreOrderDatesStrip';
import {MenuBrowser} from '@/features/menu/components/MenuBrowser';

export default function OrderSlot() {
  const brand = useBrand();
  const {data, isLoading, isError} = useProductsQuery();

  const promosQuery = usePublicPromosQuery();

  const publicCategoriesQuery = usePublicCategoriesQuery();

  const openCart = useCartUiStore(s => s.open);

  const cartQuery = useCustomerCartQuery(true);

  const ordersQuery = useMyOrdersQuery();

  const cartItems = useMemo(
    () => cartQuery.data?.cart?.items ?? [],

    [cartQuery.data]
  );

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

  const cartUniqueCount = cartItems.length;

  const activeOrderCount = useMemo(
    () =>
      (ordersQuery.data?.orders ?? []).filter(
        order =>
          order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled'
      ).length,
    [ordersQuery.data]
  );

  const cartSubtotal = useMemo(() => {
    if (promos.length === 0) {
      return cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }

    return cartItems.reduce((sum, i) => {
      const {unitPrice} = getDiscountedUnitPrice({
        promos,

        productId: i.productId,

        basePrice: i.price
      });

      return sum + unitPrice * i.quantity;
    }, 0);
  }, [cartItems, promos]);

  const availableProducts = useMemo(() => {
    // A pre-order that is fully done (no live batch and no next batch) is
    // removed from the menu. One still batching stays visible.
    return products.filter(
      p =>
        p.isAvailable &&
        p.stock > 0 &&
        !(isPreOrderProduct(p) && preOrderDisplay(p).closed)
    );
  }, [products]);

  const cartQtyById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of cartItems) map[i.productId] = (map[i.productId] ?? 0) + i.quantity;
    return map;
  }, [cartItems]);

  const addCustomerCartItem = useAddCustomerCartItemMutation();

  const handleAdd = async (item: {
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
    // Check the batch window and the owner's limit before the request so the
    // customer gets a clear message. The cart API enforces the same rules.
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
      const currentQty =
        cartItems.find(i => i.productId === item.id)?.quantity ?? 0;
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
      const currentQty =
        cartItems.find(i => i.productId === item.id)?.quantity ?? 0;
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

    try {
      await addCustomerCartItem.mutateAsync({
        productId: item.id,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        quantity: 1
      });
      openCart();
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Could not add to cart. Please try again.'));
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <StoreClosedModal />
      <div className="flex justify-start gap-2 mb-4">
        <Button
          asChild
          type="button"
          variant="ghost"
          className="relative rounded-full"
          aria-label="Order history"
        >
          <Link href="/customer/dashboard?tab=history">
            <span className="relative">
              <History className="h-20 w-20 text-[#2d4a35] dark:text-[#7ed4a0]" />
              {activeOrderCount > 0 && (
                <span className="absolute -right-3 -top-2.5 h-6 min-w-6 px-1.5 rounded-full bg-[#c30010] text-white text-[11px] font-bold grid place-items-center">
                  {activeOrderCount}
                </span>
              )}
            </span>
          </Link>
        </Button>

        <Button
          type="button"
          onClick={() => openCart()}
          variant="ghost"
          className="relative rounded-full"
          aria-label="Open cart"
        >
          <span className="relative">
            <ShoppingCart className="h-8 w-8 text-[#2d4a35] dark:text-[#7ed4a0]" />

            {cartUniqueCount > 0 && (
              <span className="absolute -right-3 -top-2.5 h-6 min-w-6 px-1.5 rounded-full bg-[#c30010] text-white text-[11px] font-bold grid place-items-center">
                {cartUniqueCount}
              </span>
            )}
          </span>

          {cartUniqueCount > 0 && (
            <span className="ml-2 text-sm font-semibold text-[#2d4a35] dark:text-[#7ed4a0]">
              ₱{cartSubtotal}.00
            </span>
          )}
        </Button>
      </div>

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
              src={brand.logo}
              alt="logo"
              width={160}
              height={160}
              className="rounded-xl object-cover"
            />
          </div>
        </div>
      </div>

      <PreOrderDatesStrip signedIn />

      <MenuBrowser
        products={availableProducts}
        promos={promos}
        categoryImages={categoryImageMap}
        basePath="customer/dashboard"
        isLoading={isLoading}
        isError={isError}
        signedIn
        cartQtyById={cartQtyById}
        onAdd={handleAdd}
        stickyClassName="top-14 -mx-4 bg-gray-50 px-4 sm:-mx-6 sm:px-6 md:top-0 dark:bg-gray-800"
      />
    </div>
  );
}
