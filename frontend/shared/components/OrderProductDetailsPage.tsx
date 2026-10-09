'use client';

import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {useProductQuery} from '@/lib/hooks/products/useProducts';
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  CalendarDays,
  User,
  Lock,
  Clock
} from 'lucide-react';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useMemo, useState} from 'react';
import {useCartStore} from '@/app/store/cartStore';
import {usePathname} from 'next/navigation';
import {useAddCustomerCartItemMutation} from '@/lib/hooks/cart/useCustomerCart';
import {useCartUiStore} from '@/app/store/cartUiStore';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {
  getDiscountedUnitPrice,
  getPromoBadgeForProduct
} from '@/lib/utils/promoPricing';
import {useCustomerCartQuery} from '@/lib/hooks/cart/useCustomerCart';
import {
  getPreOrderState,
  isPreOrderProduct,
  preOrderClosedMessage,
  preOrderDisplay,
  preOrderDisplayExtended,
  preOrderLimitMessage,
  formatPeso,
  formatCountdown,
  useNow
} from '@/lib/preOrder/preOrder';
import {toast} from 'sonner';
import {AllergenBadges} from './AllergenBadges';
import {IngredientGrid} from './IngredientGrid';
import ProductDetailSkeleton from './ProductDetailSkeleton';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';

export default function OrderProductDetailsPage({id}: {id: string}) {
  const productQuery = useProductQuery(id);
  const product = productQuery.data?.product;
  const promosQuery = usePublicPromosQuery();
  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data?.promos]
  );
  const router = useRouter();
  const pathname = usePathname();
  const isCustomerRoute = pathname.startsWith('/customer');
  const {data: me} = useMeQuery();
  const isSignedIn = !!me;

  const openCart = useCartUiStore(s => s.open);
  const cartQuery = useCustomerCartQuery(isCustomerRoute);
  const cartItems = useMemo(
    () => cartQuery.data?.cart?.items ?? [],
    [cartQuery.data]
  );
  const cartUniqueCount = cartItems.length;
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

  const addItem = useCartStore(s => s.addItem);

  const addCustomerCartItemMutation = useAddCustomerCartItemMutation();

  const [qty, setQty] = useState(1);
  const [instructions, setInstructions] = useState('');

  const now = useNow(1000);

  const badge = useMemo(() => {
    if (!product) return null;
    return getPromoBadgeForProduct({promos, productId: product._id});
  }, [product, promos]);

  // Find active promo for this product
  const activePromo = useMemo(() => {
    if (!product) return null;

    // Check if product has embedded promo data
    if (
      product.isPromoActive &&
      product.promoStartDate &&
      product.promoEndDate
    ) {
      const start = new Date(product.promoStartDate);
      const end = new Date(product.promoEndDate);
      const isActive = now >= start && now <= end;

      // Return promo object even if expired (for display purposes)
      return {
        _id: product._id,
        title: product.name,
        description: product.description,
        promoType: product.promoType || 'fixed_amount',
        discountAmount: product.discountAmount,
        discountRate: product.discountRate,
        startDate: product.promoStartDate,
        endDate: product.promoEndDate,
        isActive
      };
    }

    // Fallback to checking promos array
    const found = promos.find(p => {
      if (!p.isActive) return false;
      if (p.promoType === 'bundle') return false;
      if (!p.productIds?.includes(product._id)) return false;
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      return now >= start && now <= end;
    });
    return found || null;
  }, [product, promos, now]);

  // Promo state for ticket display
  const promoState = useMemo(() => {
    if (!activePromo || !product) return null;

    const start = new Date(activePromo.startDate);
    const end = new Date(activePromo.endDate);
    const isUpcoming = now < start;
    const isActive = now >= start && now <= end;
    const isExpired = now > end;

    const timeUntilEnd = end.getTime() - now.getTime();
    const timeUntilStart = start.getTime() - now.getTime();

    const formatCountdown = (ms: number) => {
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);

      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    // Calculate discount price using product's embedded discount or promos array
    let discountPrice = product.price;
    if (activePromo) {
      if (activePromo.discountAmount) {
        discountPrice = Math.max(0, product.price - activePromo.discountAmount);
      } else if (activePromo.discountRate) {
        discountPrice = product.price * (1 - activePromo.discountRate / 100);
      }
    }

    return {
      isUpcoming,
      isActive,
      isExpired,
      startDate: formatDate(start),
      endDate: formatDate(end),
      countdown: isUpcoming
        ? formatCountdown(timeUntilStart)
        : isActive
          ? formatCountdown(timeUntilEnd)
          : null,
      countdownLabel: isUpcoming ? 'Starts in' : 'Ends in',
      badgeText: isUpcoming
        ? 'Upcoming Promo'
        : isActive
          ? 'Active Promo'
          : 'Expired',
      badgeColor: isUpcoming
        ? 'bg-[#FAC775] text-[#412402]'
        : isActive
          ? 'bg-[#97C459] text-[#173404]'
          : 'bg-[#F09595] text-[#501313]',
      discountPrice,
      originalPrice: product.price
    };
  }, [activePromo, now, product]);

  // Pre-order state for this product: batch windows and the owner's limit
  // cap the quantity stepper and block the add button.
  const isPreOrder = isPreOrderProduct(product);
  const preOrder = useMemo(() => preOrderDisplay(product), [product]);
  const preOrderExt = useMemo(
    () => preOrderDisplayExtended(product, now),
    [product, now]
  );
  const preOrderState = useMemo(() => getPreOrderState(product), [product]);
  const preOrderClosed = isPreOrder && preOrder.closed;
  const preOrderOrderable = preOrder.orderable;
  /** Guests may view a pre-order ticket but may not order one. */
  const preOrderGuestLocked = isPreOrder && !isCustomerRoute && !isSignedIn;
  const preOrderLimit =
    isPreOrder &&
    typeof product?.preOrderPurchaseLimit === 'number' &&
    product.preOrderPurchaseLimit >= 1
      ? product.preOrderPurchaseLimit
      : null;

  /** Quantity already in the cart, so the limit applies to the total. */
  const qtyInCart = product
    ? (cartItems.find(i => i.productId === product._id)?.quantity ?? 0)
    : 0;

  const maxSelectableQty = useMemo(() => {
    if (preOrderLimit == null) return Infinity;
    return Math.max(1, preOrderLimit - qtyInCart);
  }, [preOrderLimit, qtyInCart]);

  /**
   * What the stepper actually shows and adds.
   *
   * `qty` can end up above the cap without the user doing anything: the owner
   * can lower the limit while this page is open, and adding to the cart raises
   * `qtyInCart`, which lowers the cap too. Clamping here rather than in an
   * effect keeps the displayed value correct on the very first render after
   * the cap moves, instead of showing a stale number for a frame and costing
   * an extra render pass.
   */
  const selectableQty = Math.min(qty, maxSelectableQty);

  const total = useMemo(() => {
    if (!product) return 0;
    const {unitPrice} = getDiscountedUnitPrice({
      promos,
      productId: product._id,
      basePrice: product.price
    });
    return unitPrice * selectableQty;
  }, [product, promos, selectableQty]);

  /** Why adding is blocked, or null if it is allowed. */
  const addBlockedReason = useMemo(() => {
    if (!product) return 'Product not found.';
    if (isPreOrder && !isSignedIn) {
      return 'Sign in to your customer account to order pre-orders.';
    }
    if (preOrderClosed) return preOrderClosedMessage(product.name);
    if (isPreOrder && !preOrderOrderable) {
      return preOrder.statusLine
        ? `${product.name} — ${preOrder.statusLine}. Please check back then.`
        : preOrderClosedMessage(product.name);
    }
    if (preOrderLimit != null && qtyInCart >= preOrderLimit) {
      return preOrderLimitMessage({
        productName: product.name,
        limit: preOrderLimit,
        currentQty: qtyInCart
      });
    }
    return null;
  }, [
    product,
    preOrderClosed,
    isPreOrder,
    preOrderOrderable,
    preOrder,
    preOrderLimit,
    qtyInCart,
    isSignedIn
  ]);

  const handleAddToCart = () => {
    if (!product) return;
    if (addBlockedReason) {
      toast.error(addBlockedReason);
      return;
    }
    if (isCustomerRoute) {
      addCustomerCartItemMutation.mutate({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: selectableQty,
        imageUrl: product.imageUrl,
        instructions: instructions.trim().length
          ? instructions.trim()
          : undefined
      });
    } else {
      addItem({
        productId: product._id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        qty: selectableQty,
        instructions: instructions.trim().length
          ? instructions.trim()
          : undefined
      });
    }
    openCart();
  };

  return (
    <div
      className={
        isCustomerRoute
          ? 'min-h-screen bg-gray-50'
          : 'min-h-screen bg-gray-50 flex justify-center items-center'
      }
    >
      <div
        className={
          'w-full max-w-6xl mx-auto px-4 py-6' +
          (isCustomerRoute ? ' pb-28' : '')
        }
      >
        {isCustomerRoute ? (
          <div className="flex justify-end mb-4">
            <Button
              type="button"
              onClick={() => openCart()}
              variant="ghost"
              className="relative rounded-full"
              aria-label="Open cart"
            >
              <span className="relative">
                <ShoppingCart className="h-5 w-5 text-[#2d4a35]" />
                {cartUniqueCount > 0 && (
                  <span className="absolute -right-2 -top-2 h-5 min-w-5 px-1 rounded-full bg-[#c30010] text-white text-[10px] font-bold grid place-items-center">
                    {cartUniqueCount}
                  </span>
                )}
              </span>
              {cartUniqueCount > 0 && (
                <span className="ml-2 text-sm font-semibold text-[#2d4a35]">
                  ₱{cartSubtotal}.00
                </span>
              )}
            </Button>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Back</h1>
        </div>

        {productQuery.isLoading && <ProductDetailSkeleton />}

        {productQuery.isError && (
          <div className="mt-8 text-sm text-gray-500">
            Failed to load product.
          </div>
        )}

        {product && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div className="w-full">
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white border border-gray-100">
                <Image
                  src={
                    product.imageUrl && product.imageUrl.length > 0
                      ? product.imageUrl
                      : '/assets/sample_menu.png'
                  }
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>

            <div className="w-full">
              {/* Promo ticket — replaces the right panel when product has active or upcoming promo */}
              {promoState &&
              (promoState.isActive || promoState.isUpcoming) &&
              !isPreOrder ? (
                <div className="w-full rounded-[20px] overflow-hidden bg-white border border-gray-200">
                  {/* Hero */}
                  <div className="bg-[#2F4A3A] text-white px-5.5 pt-5 pb-6">
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-[13px] font-medium px-3 py-1.25 rounded-full ${promoState.badgeColor}`}
                      >
                        {promoState.badgeText}
                      </span>
                      <span className="text-xs text-[#C9D8CD]">Promo Item</span>
                    </div>
                    <div className="text-[15px] text-[#C9D8CD] mt-4.5 truncate">
                      {product.name}
                    </div>
                    <div className="text-[32px] leading-[1.15] font-medium mt-1 break-words">
                      ₱{promoState.discountPrice}.00
                    </div>
                    {promoState.originalPrice > promoState.discountPrice && (
                      <p className="text-[15px] text-[#C9D8CD] line-through mt-1">
                        ₱{promoState.originalPrice}.00
                      </p>
                    )}
                    {promoState.countdown && (
                      <>
                        <div className="text-sm text-[#C9D8CD] mt-4.5 mb-2">
                          {promoState.countdownLabel}
                        </div>
                        <div className="text-[34px] leading-none font-medium">
                          {promoState.countdown}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="relative h-0">
                    <div className="absolute inset-x-5 top-0 border-t-2 border-dashed border-gray-300" />
                    <div className="absolute -left-3.25 -top-3.25 w-6.5 h-6.5 rounded-full bg-gray-50" />
                    <div className="absolute -right-3.25 -top-3.25 w-6.5 h-6.5 rounded-full bg-gray-50" />
                  </div>
                  <div className="px-5.5 pt-6 pb-5.5">
                    <div className="flex items-center gap-2.5 text-base text-gray-900">
                      <CalendarDays className="w-5 h-5 text-gray-500" />
                      <span>
                        {promoState.startDate} - {promoState.endDate}
                      </span>
                    </div>

                    {product.description && (
                      <div className="mt-4 text-sm text-gray-600 leading-relaxed">
                        {product.description}
                      </div>
                    )}

                    <div className="mt-5">
                      <Label className="text-sm font-semibold text-gray-900">
                        Order notes
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Add a note for the kitchen (e.g. no ginger, less spicy).
                      </p>
                      <textarea
                        value={instructions}
                        onChange={e => setInstructions(e.target.value)}
                        placeholder="Type your request here..."
                        className="mt-3 w-full min-h-28 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3c5e45]/20 focus:border-[#3c5e45]"
                      />
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                      <div className="flex items-center gap-3.5 text-lg font-medium">
                        <button
                          type="button"
                          onClick={() => setQty(q => Math.max(1, q - 1))}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                        <span className="min-w-6 text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(q => q + 1)}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddToCart}
                        className="flex-1 h-13.5 rounded-full text-[17px] font-medium bg-[#2F4A3A] text-white"
                      >
                        Add to cart · ₱{promoState.discountPrice * qty}.00
                      </Button>
                    </div>
                    <p className="mt-5 text-[13px] leading-relaxed text-gray-500">
                      This promo is available for a limited time. Add it to your
                      cart before it expires!
                    </p>
                  </div>
                </div>
              ) : !isPreOrder ? (
                <div>
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-gray-900">
                        {product.name}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {product.category}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {(() => {
                        const {unitPrice} = getDiscountedUnitPrice({
                          promos,
                          productId: product._id,
                          basePrice: product.price
                        });
                        const isDiscounted = unitPrice < product.price;
                        return (
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              ₱{unitPrice}.00
                            </p>
                            {isDiscounted ? (
                              <p className="text-[11px] text-gray-400 line-through">
                                ₱{product.price}.00
                              </p>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {badge ? (
                    <div className="mt-3 inline-flex items-center rounded-full bg-[#c30010] text-white px-3 py-1 text-xs font-extrabold">
                      {badge.label}
                    </div>
                  ) : null}

                  {product.description && (
                    <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                      {product.description}
                    </p>
                  )}

                  <AllergenBadges allergens={product.allergens ?? []} />
                  <IngredientGrid ingredients={product.ingredients ?? []} />

                  <div className="mt-8">
                    <Label className="text-sm font-semibold text-gray-900">
                      Order notes
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Add a note for the kitchen (e.g. no ginger, less spicy).
                    </p>
                    <textarea
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                      placeholder="Type your request here..."
                      className="mt-3 w-full min-h-28 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3c5e45]/20 focus:border-[#3c5e45]"
                    />
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="inline-flex items-center justify-center sm:justify-start gap-3">
                      <button
                        type="button"
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5 text-gray-600" />
                      </button>

                      <span className="min-w-6 text-center text-base font-semibold text-gray-900">
                        {selectableQty}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setQty(q => Math.min(q + 1, maxSelectableQty))
                        }
                        disabled={selectableQty >= maxSelectableQty}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                    </div>
                    <Button
                      type="button"
                      disabled={
                        !product ||
                        preOrderClosed ||
                        (isPreOrder && !preOrderOrderable)
                      }
                      onClick={() => {
                        if (!product) return;
                        if (addBlockedReason) {
                          toast.error(addBlockedReason);
                          return;
                        }
                        if (isCustomerRoute) {
                          addCustomerCartItemMutation.mutate({
                            productId: product._id,
                            name: product.name,
                            price: product.price,
                            quantity: selectableQty,
                            imageUrl: product.imageUrl,
                            instructions: instructions.trim().length
                              ? instructions.trim()
                              : undefined
                          });
                        } else {
                          addItem({
                            productId: product._id,
                            name: product.name,
                            price: product.price,
                            imageUrl: product.imageUrl,
                            qty: selectableQty,
                            instructions: instructions.trim().length
                              ? instructions.trim()
                              : undefined
                          });
                        }
                        openCart();
                      }}
                      className="w-full sm:flex-1 h-12 rounded-full bg-[#3c5e45] text-white"
                    >
                      {preOrderClosed
                        ? 'Pre-order closed'
                        : isPreOrder && !preOrderOrderable
                          ? preOrder.statusLine || 'Pre-order not open yet'
                          : `Add to Cart - ₱${total}.00`}
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Pre-order ticket — replaces the whole right panel */}
              {isPreOrder && preOrderExt && (
                <div className="w-full rounded-[20px] overflow-hidden bg-white border border-gray-200">
                  {/* Hero */}
                  <div className="bg-[#2F4A3A] text-white px-[22px] pt-5 pb-6">
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-[13px] font-medium px-3 py-[5px] rounded-full ${
                          preOrderExt.uiState === 'waiting' ||
                          preOrderExt.uiState === 'sold_out_next'
                            ? 'bg-[#FAC775] text-[#412402]'
                            : preOrderExt.uiState === 'live'
                              ? 'bg-[#97C459] text-[#173404]'
                              : preOrderExt.uiState === 'live_low'
                                ? 'bg-[#F0997B] text-[#4A1B0C]'
                                : preOrderExt.uiState === 'sold_out_final'
                                  ? 'bg-[#F09595] text-[#501313]'
                                  : 'bg-[#D3D1C7] text-[#2C2C2A]'
                        }`}
                      >
                        {preOrderExt.badgeText}
                      </span>
                      <span className="text-xs text-[#C9D8CD]">
                        Pre-order item
                      </span>
                    </div>
                    <div className="text-[15px] text-[#C9D8CD] mt-[18px] truncate">
                      {product?.name}
                    </div>
                    <div className="text-[32px] leading-[1.15] font-medium mt-1 break-words">
                      {preOrderExt.headline}
                    </div>
                    {(preOrderExt.uiState === 'waiting' ||
                      preOrderExt.uiState === 'live') &&
                    preOrderExt.countdownTarget ? (
                      <>
                        <div className="text-sm text-[#C9D8CD] mt-[18px] mb-2">
                          {preOrderExt.countdownLabel}
                        </div>
                        {(() => {
                          const ms = Math.max(
                            0,
                            preOrderExt.countdownTarget.getTime() -
                              now.getTime()
                          );
                          const cd = formatCountdown(ms);
                          return (
                            <div className="flex gap-[10px]">
                              <div className="text-center">
                                <div className="bg-white/[0.14] rounded-xl min-w-[68px] py-[10px] text-[34px] leading-none font-medium">
                                  {cd.hours}
                                </div>
                                <div className="text-xs text-[#C9D8CD] mt-1.5 lowercase">
                                  hours
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="bg-white/[0.14] rounded-xl min-w-[68px] py-[10px] text-[34px] leading-none font-medium">
                                  {cd.minutes}
                                </div>
                                <div className="text-xs text-[#C9D8CD] mt-1.5 lowercase">
                                  min
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="bg-white/[0.14] rounded-xl min-w-[68px] py-[10px] text-[34px] leading-none font-medium">
                                  {cd.seconds}
                                </div>
                                <div className="text-xs text-[#C9D8CD] mt-1.5 lowercase">
                                  sec
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    ) : preOrderExt.uiState === 'sold_out_final' ||
                      preOrderExt.uiState === 'closed' ? (
                      <div className="text-[15px] text-[#C9D8CD] mt-[18px]">
                        {preOrderExt.uiState === 'sold_out_final'
                          ? 'This pre-order is full. Check back for the next one.'
                          : ''}
                      </div>
                    ) : null}
                  </div>
                  <div className="relative h-0">
                    <div className="absolute inset-x-5 top-0 border-t-2 border-dashed border-gray-300" />
                    <div className="absolute -left-[13px] -top-[13px] w-[26px] h-[26px] rounded-full bg-gray-50" />
                    <div className="absolute -right-[13px] -top-[13px] w-[26px] h-[26px] rounded-full bg-gray-50" />
                  </div>
                  <div className="px-[22px] pt-6 pb-[22px]">
                    <div className="flex items-center gap-[10px] text-base text-gray-900">
                      <CalendarDays className="w-5 h-5 text-gray-500" />
                      <span>{preOrderExt.scheduleLabel}</span>
                    </div>
                    {!preOrderExt.singleBatch &&
                      preOrderState.batches.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-2">
                            <Clock className="w-4 h-4" />
                            <span>Today's batches</span>
                          </div>
                          <div className="flex gap-2">
                            {preOrderState.batches.map(b => {
                              const isLive = b.status === 'live';
                              const isDone =
                                b.status === 'ended' || b.status === 'sold_out';
                              return (
                                <div
                                  key={b.number}
                                  className={`flex-1 rounded-xl px-2 py-2 text-center border ${
                                    isLive
                                      ? 'border-[#2F4A3A] bg-[#2F4A3A] text-white'
                                      : isDone
                                        ? 'border-gray-200 bg-gray-50 text-gray-400'
                                        : 'border-gray-200 bg-white text-gray-600'
                                  }`}
                                >
                                  <div className="text-[11px] opacity-80">
                                    Batch {b.number}
                                  </div>
                                  <div className="text-[13px] font-medium">
                                    {b.startTime}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    {(preOrderExt.uiState === 'live' ||
                      preOrderExt.uiState === 'live_low') && (
                      <div className="mt-4">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[22px] font-medium">
                            {preOrderExt.remaining} left
                          </span>
                          <span className="text-[13px] text-gray-500">
                            of {preOrderExt.stock}
                          </span>
                        </div>
                        <div className="mt-2 h-[10px] rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(0, Math.min(100, preOrderExt.percentLeft))}%`,
                              backgroundColor:
                                preOrderExt.uiState === 'live_low'
                                  ? '#D85A30'
                                  : '#639922'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {preOrderExt.limitLabel && (
                        <div className="flex items-center gap-1 text-[13px] px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{preOrderExt.limitLabel}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[13px] px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                        <Lock className="w-4 h-4" />
                        <span>Signed-in customers only</span>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center gap-3">
                      <div
                        className={`flex items-center gap-[14px] text-lg font-medium ${preOrderGuestLocked || (preOrderExt.uiState !== 'live' && preOrderExt.uiState !== 'live_low') ? 'opacity-60' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => setQty(q => Math.max(1, q - 1))}
                          disabled={
                            preOrderGuestLocked ||
                            (preOrderExt.uiState !== 'live' &&
                              preOrderExt.uiState !== 'live_low')
                          }
                          className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                        <span className="min-w-6 text-center">
                          {selectableQty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQty(q => Math.min(q + 1, maxSelectableQty))
                          }
                          disabled={
                            preOrderGuestLocked ||
                            (preOrderExt.uiState !== 'live' &&
                              preOrderExt.uiState !== 'live_low') ||
                            selectableQty >= maxSelectableQty
                          }
                          className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          if (preOrderGuestLocked) {
                            router.push('/sign-in');
                            return;
                          }
                          handleAddToCart();
                        }}
                        disabled={
                          !preOrderGuestLocked &&
                          !(
                            preOrderExt.uiState === 'live' ||
                            preOrderExt.uiState === 'live_low'
                          )
                        }
                        className={`flex-1 h-[54px] rounded-full text-[17px] font-medium ${
                          preOrderGuestLocked
                            ? 'bg-[#2F4A3A] text-white hover:bg-[#254133] transition-colors'
                            : preOrderExt.uiState === 'live' ||
                                preOrderExt.uiState === 'live_low'
                              ? 'bg-[#2F4A3A] text-white'
                              : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {preOrderGuestLocked
                          ? 'Sign in to order'
                          : preOrderExt.uiState === 'live' ||
                              preOrderExt.uiState === 'live_low'
                            ? `Add to cart · ${formatPeso(product?.price || 0)}`
                            : preOrderExt.buttonLabel}
                      </Button>
                    </div>
                    <p className="mt-5 text-[13px] leading-relaxed text-gray-500">
                      {preOrderGuestLocked
                        ? "Pre-orders are for registered DonClaudio's customers. Create an account or log in, then come back to place your order."
                        : preOrderExt.singleBatch
                          ? 'Pre-orders close at the deadline shown above. Stock is shared by all customers and updates as orders come in.'
                          : 'Each batch has its own window and stock. When a batch ends, the next one opens on schedule.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
