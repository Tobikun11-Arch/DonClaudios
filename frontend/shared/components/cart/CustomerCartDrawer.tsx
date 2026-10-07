'use client';

import {useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import Image from 'next/image';
import {
  X,
  Minus,
  Plus,
  ChevronDown,
  Bike,
  ShoppingBag,
  CalendarClock
} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {useCartUiStore} from '@/app/store/cartUiStore';
import {
  useCustomerCartQuery,
  useRemoveCustomerCartItemMutation,
  useSetCustomerCartItemQuantityMutation
} from '@/lib/hooks/cart/useCustomerCart';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import {getDiscountedUnitPrice} from '@/lib/utils/promoPricing';
import {
  isPreOrderProduct,
  preOrderClosedMessage,
  preOrderDisplay,
  preOrderLimitLabel,
  preOrderLimitMessage
} from '@/lib/preOrder/preOrder';
import {type Product} from '@/lib/types/product';
import {useOrderDetailsStore} from '@/app/store/orderDetailsStore';
import {useStoreStatusQuery} from '@/lib/hooks/useStoreStatus';
import {Z} from '@/lib/zIndex';
import CartRemoveConfirmModal from './CartRemoveConfirmModal';

type CustomerCartDrawerProps = {
  deliveryFee?: number;
};

export default function CustomerCartDrawer({
  deliveryFee: _deliveryFee = 49
}: CustomerCartDrawerProps) {
  const router = useRouter();
  const isOpen = useCartUiStore(s => s.isOpen);
  const close = useCartUiStore(s => s.close);

  const orderType = useOrderDetailsStore(s => s.orderType);
  const timing = useOrderDetailsStore(s => s.timing);
  const reservationGuests = useOrderDetailsStore(s => s.reservationGuests);
  const reservationDate = useOrderDetailsStore(s => s.reservationDate);
  const reservationTime = useOrderDetailsStore(s => s.reservationTime);
  const setOrderType = useOrderDetailsStore(s => s.setOrderType);
  const setTiming = useOrderDetailsStore(s => s.setTiming);
  const setReservationGuests = useOrderDetailsStore(
    s => s.setReservationGuests
  );
  const setReservationDate = useOrderDetailsStore(s => s.setReservationDate);
  const setReservationTime = useOrderDetailsStore(s => s.setReservationTime);

  const promosQuery = usePublicPromosQuery();
  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data?.promos]
  );

  const storeStatusQuery = useStoreStatusQuery();
  const storeClosed = storeStatusQuery.data?.status.isOpen === false;

  const cartQuery = useCustomerCartQuery(isOpen);

  const setQtyMutation = useSetCustomerCartItemQuantityMutation();
  const removeItemMutation = useRemoveCustomerCartItemMutation();

  const items = useMemo(
    () => cartQuery.data?.cart?.items ?? [],
    [cartQuery.data]
  );

  const productsQuery = useProductsQuery();
  const preOrderByProductId = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of productsQuery.data?.products ?? []) {
      if (isPreOrderProduct(p)) map.set(p._id, p);
    }
    return map;
  }, [productsQuery.data]);

  /**
   * Cart items whose batch window has closed or is not currently open.
   *
   * A cart can outlive a batch window (left open overnight) or an owner's
   * limit edit, so we re-check here rather than trusting what was true when
   * the item was added. The backend rejects these at order time regardless.
   */
  const blockedPreOrderItems = useMemo(() => {
    const out: Array<{name: string; reason: string}> = [];
    for (const i of items) {
      const p = preOrderByProductId.get(i.productId);
      if (!p) continue;
      const display = preOrderDisplay(p);
      if (display.closed) {
        out.push({name: i.name, reason: preOrderClosedMessage(i.name)});
      } else if (!display.orderable) {
        out.push({
          name: i.name,
          reason: display.statusLine
            ? `${i.name} — ${display.statusLine}. Please check back then.`
            : preOrderClosedMessage(i.name)
        });
      }
    }
    return out;
  }, [items, preOrderByProductId]);

  const subtotal = useMemo(() => {
    if (promos.length === 0) {
      return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }

    return items.reduce((sum, i) => {
      const {unitPrice} = getDiscountedUnitPrice({
        promos,
        productId: i.productId,
        basePrice: i.price
      });
      return sum + unitPrice * i.quantity;
    }, 0);
  }, [items, promos]);

  const effectiveDeliveryFee =
    items.length > 0 && orderType === 'Delivery' ? _deliveryFee : 0;
  const total = subtotal + effectiveDeliveryFee;

  const defaultScheduleDate = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [draftOrderType, setDraftOrderType] = useState<
    'Delivery' | 'Pick-up' | 'Reservation'
  >('Delivery');
  const [draftTiming, setDraftTiming] = useState<'ASAP'>('ASAP');
  const [draftReservationGuests, setDraftReservationGuests] = useState(1);
  const [draftReservationDate, setDraftReservationDate] =
    useState(defaultScheduleDate);
  const [draftReservationTime, setDraftReservationTime] = useState('18:00');
  const [removeTarget, setRemoveTarget] = useState<{
    productId: string;
    name: string;
  } | null>(null);

  // Lock page scroll while the drawer (and its modals) are open. The
  // customer layout scrolls inside `<main>`, but the checkout page and any
  // future body-scrolled page must not scroll behind the overlay either.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // `document.body` only exists on the client. The drawer only ever opens
  // after hydration (via a user click), so this guard is purely SSR safety.
  if (!isOpen || typeof document === 'undefined') return null;

  const openOrderDetails = () => {
    setDraftOrderType(orderType);
    setDraftTiming(timing);
    setDraftReservationGuests(reservationGuests);
    setDraftReservationDate(reservationDate || defaultScheduleDate);
    setDraftReservationTime(reservationTime || '18:00');
    setOrderDetailsOpen(true);
  };

  const cancelOrderDetails = () => {
    setOrderDetailsOpen(false);
  };

  const confirmOrderDetails = () => {
    setOrderType(draftOrderType);
    setTiming(draftTiming);
    setReservationGuests(Math.max(1, draftReservationGuests));
    setReservationDate(draftReservationDate);
    setReservationTime(draftReservationTime);
    setOrderDetailsOpen(false);
  };

  const goToCheckout = () => {
    // A pre-order can close while it sits in the cart (batch window ended, or
    // the owner lowered the limit). Catch it here rather than letting checkout
    // fail after the customer has filled in everything.
    if (blockedPreOrderItems.length > 0) {
      toast.error(blockedPreOrderItems[0].reason);
      return;
    }

    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now());
    close();
    router.push(`/customer/dashboard/checkout/${id}`);
  };

  const requestRemoveItem = (item: {productId: string; name: string}) => {
    setRemoveTarget({productId: item.productId, name: item.name});
  };

  const confirmRemoveItem = () => {
    if (!removeTarget) return;
    removeItemMutation.mutate(removeTarget.productId, {
      onSuccess: () => setRemoveTarget(null)
    });
  };

  /**
   * Why the "+" button is unavailable for this item, or null if it is fine.
   * Used both to disable the button and to explain it on click of the label.
   */
  const increaseBlockedReason = (item: {
    productId: string;
    name: string;
    quantity: number;
  }): string | null => {
    const po = preOrderByProductId.get(item.productId);
    if (!po) return null;

    const display = preOrderDisplay(po);

    if (display.closed) {
      return preOrderClosedMessage(item.name);
    }

    if (!display.orderable) {
      return display.statusLine
        ? `${item.name} — ${display.statusLine}. Please check back then.`
        : preOrderClosedMessage(item.name);
    }

    const limit = po.preOrderPurchaseLimit;
    if (
      typeof limit === 'number' &&
      limit >= 1 &&
      item.quantity + 1 > limit
    ) {
      return preOrderLimitMessage({
        productName: item.name,
        limit,
        currentQty: item.quantity
      });
    }

    return null;
  };

  const increaseItem = (item: {
    productId: string;
    name: string;
    quantity: number;
  }) => {
    const blocked = increaseBlockedReason(item);
    if (blocked) {
      toast.error(blocked);
      return;
    }
    setQtyMutation.mutate({
      productId: item.productId,
      quantity: item.quantity + 1
    });
  };

  const summaryText =
    orderType === 'Reservation'
      ? `${orderType}, ${reservationDate}, ${reservationTime}`
      : `${orderType}, Today, ${timing}`;

  // The drawer is portaled to `document.body` so no ancestor (transform,
  // overflow, stacking context) can trap it below the floating chrome. Its
  // overlay layer dims the bell and chat bubble and eats their clicks.
  return createPortal(
    <div className={`fixed inset-0 ${Z.drawerOverlay}`}>
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={close}
        aria-label="Close cart"
      />

      <div
        className={
          'absolute bg-white shadow-2xl flex flex-col ' +
          'w-full md:w-105 ' +
          'bottom-0 md:bottom-auto md:top-0 md:right-0 ' +
          'h-[85dvh] md:h-dvh ' +
          'rounded-t-3xl md:rounded-none'
        }
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900">
              My Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
            </p>
            <button
              type="button"
              className="mt-0.5 w-full inline-flex items-center justify-between gap-2 text-left text-xs font-semibold text-[#c30010]"
              onClick={openOrderDetails}
            >
              <span className="min-w-0 truncate">{summaryText}</span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </button>
          </div>

          <Button
            type="button"
            onClick={close}
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cartQuery.isLoading && (
            <div className="text-sm text-gray-500 py-10 text-center">
              Loading cart...
            </div>
          )}

          {cartQuery.isError && (
            <div className="text-sm text-gray-500 py-10 text-center">
              Failed to load cart.
            </div>
          )}

          {!cartQuery.isLoading && !cartQuery.isError && items.length === 0 && (
            <div className="text-sm text-gray-500 py-10 text-center">
              Your cart is empty.
            </div>
          )}

          {!cartQuery.isLoading && !cartQuery.isError && items.length > 0 && (
            <div className="space-y-4">
              {items.map(item => (
                <div
                  key={item.productId}
                  className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                    <Image
                      src={
                        item.imageUrl && item.imageUrl.length > 0
                          ? item.imageUrl
                          : '/assets/sample_menu.png'
                      }
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                          {item.name}
                        </p>
                        {(() => {
                          const po = preOrderByProductId.get(item.productId);
                          if (!po) return null;
                          const display = preOrderDisplay(po);
                          const label = display.closed
                            ? 'Pre-order closed'
                            : !display.orderable
                              ? display.statusLine
                              : preOrderLimitLabel(po);
                          if (!label) return null;
                          return (
                            <p
                              className={cn(
                                'mt-0.5 text-[11px] font-semibold',
                                display.closed || !display.orderable
                                  ? 'text-gray-500'
                                  : 'text-purple-700'
                              )}
                            >
                              {label}
                            </p>
                          );
                        })()}
                        <button
                          type="button"
                          className="mt-1 text-xs font-semibold text-[#c30010]"
                          onClick={() => requestRemoveItem(item)}
                          disabled={removeItemMutation.isPending}
                        >
                          Remove
                        </button>
                      </div>

                      {(() => {
                        const {unitPrice} = getDiscountedUnitPrice({
                          promos,
                          productId: item.productId,
                          basePrice: item.price
                        });

                        const isDiscounted = unitPrice < item.price;

                        return (
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-gray-900">
                              ₱{unitPrice}.00
                            </p>
                            {isDiscounted ? (
                              <p className="text-[11px] text-gray-400 line-through">
                                ₱{item.price}.00
                              </p>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      <div className="inline-flex items-center rounded-full border border-gray-200 overflow-hidden">
                        <button
                          type="button"
                          className="h-8 w-10 inline-flex items-center justify-center hover:bg-gray-50"
                          onClick={() => {
                            if (item.quantity <= 1) {
                              requestRemoveItem(item);
                              return;
                            }
                            setQtyMutation.mutate({
                              productId: item.productId,
                              quantity: item.quantity - 1
                            });
                          }}
                          aria-label="Decrease"
                          disabled={setQtyMutation.isPending}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <div className="min-w-10 text-center text-sm font-semibold text-gray-900">
                          {item.quantity}
                        </div>
                        <button
                          type="button"
                          className="h-8 w-10 inline-flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          onClick={() => increaseItem(item)}
                          aria-label="Increase"
                          disabled={
                            setQtyMutation.isPending ||
                            increaseBlockedReason(item) !== null
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-semibold">₱{subtotal}.00</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Delivery fee</span>
                  <span className="font-semibold">
                    ₱{effectiveDeliveryFee}.00
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-5 py-4 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Total</p>
            <p className="text-lg font-extrabold text-gray-900">
              ₱{items.length > 0 ? total : 0}.00
            </p>
          </div>

          <Button
            type="button"
            className="mt-4 w-full h-12 rounded-full bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
            disabled={items.length === 0 || storeClosed}
            onClick={goToCheckout}
          >
            {storeClosed ? 'Store is Closed' : 'Go To Checkout'}
          </Button>
        </div>
      </div>

      {orderDetailsOpen ? (
        <div
          className={`fixed inset-0 ${Z.orderModal} bg-black/40 flex items-center justify-center p-4`}
          onClick={cancelOrderDetails}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-[520px] max-h-[calc(100vh-32px)] rounded-[24px] bg-white shadow-[0_24px_60px_rgba(0,0,0,.35)] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
            style={
              {
                ['--brand-green']: '#3d6146',
                ['--brand-green-tint']: '#eef4ef',
                ['--cta-red']: '#b80012',
                ['--text']: '#1a1a1a',
                ['--text-muted']: '#5f5f5a',
                ['--border']: '#e2e2de',
                ['--surface-muted']: '#f1f1ee',
                ['--surface-soft']: '#fafaf8'
              } as React.CSSProperties
            }
          >
            <div className="flex items-start justify-between px-[28px] pt-[28px]">
              <div>
                <h2
                  className="text-[22px] font-extrabold leading-tight"
                  style={{color: 'var(--text)', fontWeight: 800}}
                >
                  How would you like your order?
                </h2>
                <p
                  className="mt-1.5 text-[14px]"
                  style={{color: 'var(--text-muted)'}}
                >
                  Pick one. You can change it anytime.
                </p>
              </div>
              <Button
                type="button"
                onClick={cancelOrderDetails}
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div
              className="px-[28px] pt-[22px] flex gap-3"
              role="radiogroup"
            >
              {(['Delivery', 'Pick-up', 'Reservation'] as const).map(type => {
                const isSelected = draftOrderType === type;
                const baseClasses =
                  'relative flex flex-1 flex-col items-center gap-2 rounded-2xl border-[1.5px] bg-white px-2 pb-4 pt-5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)] focus-visible:ring-offset-2';
                return (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setDraftOrderType(type);
                      if (type === 'Reservation') {
                        if (!draftReservationDate) {
                          setDraftReservationDate(defaultScheduleDate);
                        } else {
                          setDraftReservationDate(prev =>
                            prev < defaultScheduleDate ? defaultScheduleDate : prev
                          );
                        }
                      }
                    }}
                    className={baseClasses}
                    style={{
                      borderColor: isSelected
                        ? 'var(--brand-green)'
                        : 'var(--border)',
                      backgroundColor: isSelected
                        ? 'var(--brand-green-tint)'
                        : 'white',
                      boxShadow: isSelected
                        ? '0 0 0 1px var(--brand-green)'
                        : undefined,
                      minHeight: '44px'
                    }}
                  >
                    {isSelected ? (
                      <div
                        className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full"
                        style={{backgroundColor: 'var(--brand-green)'}}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          stroke="white"
                          fill="none"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : null}
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-[14px]"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--brand-green)'
                          : 'var(--surface-muted)',
                        color: isSelected ? 'white' : 'var(--brand-green)'
                      }}
                    >
                      {type === 'Delivery' ? (
                        <Bike className="h-6 w-6" strokeWidth={2} />
                      ) : type === 'Pick-up' ? (
                        <ShoppingBag className="h-6 w-6" strokeWidth={2} />
                      ) : (
                        <CalendarClock className="h-6 w-6" strokeWidth={2} />
                      )}
                    </div>
                    <p
                      className="text-[15px] font-bold"
                      style={{color: 'var(--text)'}}
                    >
                      {type === 'Pick-up' ? 'Pick-up' : type}
                    </p>
                    <p
                      className="text-[12px] leading-tight"
                      style={{color: 'var(--text-muted)'}}
                    >
                      {type === 'Delivery'
                        ? 'To your door'
                        : type === 'Pick-up'
                          ? 'Grab it at the shop'
                          : 'Book a table'}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="px-[28px] pt-6 flex-1 overflow-y-auto">
              {draftOrderType === 'Delivery' ? (
                <div className="space-y-6">
                </div>
              ) : draftOrderType === 'Pick-up' ? (
                <div className="space-y-6">
                  <div>
                    <span
                      className="mb-2 block text-[13px] font-bold"
                      style={{color: 'var(--text)'}}
                    >
                      Pick up at
                    </span>
                    <div
                      className="flex items-center gap-3 rounded-xl border-[1.5px] p-3.5"
                      style={{
                        borderColor: 'var(--border)',
                        backgroundColor: 'var(--surface-soft)'
                      }}
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-[14px] shrink-0"
                        style={{
                          backgroundColor: 'var(--surface-muted)',
                          color: 'var(--brand-green)'
                        }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          fill="none"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-[15px] font-bold"
                          style={{color: 'var(--text)'}}
                        >
                          DonClaudio&apos;s Lechon House
                        </p>
                        <p
                          className="mt-0.5 text-[13px] leading-snug"
                          style={{color: 'var(--text-muted)'}}
                        >
                          Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza,
                          Cavite, Philippines 4108
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : draftOrderType === 'Reservation' ? (
                <div className="space-y-6">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label
                        htmlFor="reservation-date"
                        className="mb-2 block text-[13px] font-bold"
                        style={{color: 'var(--text)'}}
                      >
                        Date
                      </label>
                      <input
                        id="reservation-date"
                        type="date"
                        value={draftReservationDate}
                        min={defaultScheduleDate}
                        onChange={e => setDraftReservationDate(e.target.value)}
                        className="h-12 w-full rounded-xl border-[1.5px] px-3.5 text-[15px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)] focus:ring-offset-0"
                        style={{
                          borderColor: 'var(--border)',
                          color: 'var(--text)'
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="reservation-time"
                        className="mb-2 block text-[13px] font-bold"
                        style={{color: 'var(--text)'}}
                      >
                        Time
                      </label>
                      <input
                        id="reservation-time"
                        type="time"
                        value={draftReservationTime}
                        onChange={e => setDraftReservationTime(e.target.value)}
                        className="h-12 w-full rounded-xl border-[1.5px] px-3.5 text-[15px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)] focus:ring-offset-0"
                        style={{
                          borderColor: 'var(--border)',
                          color: 'var(--text)'
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="reservation-guests"
                      className="mb-2 block text-[13px] font-bold"
                      style={{color: 'var(--text)'}}
                    >
                      Number of guests
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label="Fewer guests"
                        className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] bg-white transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)] focus-visible:ring-offset-2"
                        style={{borderColor: 'var(--border)', minHeight: 44}}
                        onClick={() =>
                          setDraftReservationGuests(
                            Math.max(1, draftReservationGuests - 1)
                          )
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="flex min-w-[56px] items-center justify-center text-[18px] font-bold">
                        {draftReservationGuests}
                      </div>
                      <button
                        type="button"
                        aria-label="More guests"
                        className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] bg-white transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)] focus-visible:ring-offset-2"
                        style={{borderColor: 'var(--border)', minHeight: 44}}
                        onClick={() =>
                          setDraftReservationGuests(
                            draftReservationGuests + 1
                          )
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span
                        className="text-sm"
                        style={{color: 'var(--text-muted)'}}
                      >
                        guest(s)
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div
              className="mt-2 flex items-center justify-end gap-2.5 border-t px-[28px] py-[28px]"
              style={{borderColor: '#eee'}}
            >
              <Button
                type="button"
                variant="outline"
                onClick={cancelOrderDetails}
                className="h-12 rounded-xl border-[1.5px] px-6 text-[15px] font-bold"
                style={{borderColor: 'var(--border)'}}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmOrderDetails}
                className="h-12 rounded-xl px-8 text-[15px] font-bold text-white hover:brightness-90"
                style={{backgroundColor: 'var(--cta-red)'}}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <CartRemoveConfirmModal
        isOpen={removeTarget !== null}
        itemName={removeTarget?.name ?? ''}
        isRemoving={removeItemMutation.isPending}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={confirmRemoveItem}
      />
    </div>,
    document.body
  );
}
