'use client';

import {useMemo, useState} from 'react';
import Image from 'next/image';
import {
  X,
  Minus,
  Plus,
  Bike,
  ShoppingBag,
  CalendarClock,
  ChevronDown
} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {getCartSubtotal, useCartStore} from '@/app/store/cartStore';
import {useCartUiStore} from '@/app/store/cartUiStore';
import {useOrderDetailsStore} from '@/app/store/orderDetailsStore';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {getDiscountedUnitPrice} from '@/lib/utils/promoPricing';

type CartDrawerProps = {
  deliveryFee?: number;
};

export default function CartDrawer({deliveryFee = 49}: CartDrawerProps) {
  const router = useRouter();
  const isOpen = useCartUiStore(s => s.isOpen);
  const close = useCartUiStore(s => s.close);
  const items = useCartStore(s => s.items);
  const setQty = useCartStore(s => s.setQty);
  const removeItem = useCartStore(s => s.removeItem);

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

  const promosQuery = usePublicPromosQuery();
  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data?.promos]
  );

  const subtotal = useMemo(() => {
    if (promos.length === 0) return getCartSubtotal(items);
    return items.reduce((sum, i) => {
      const {unitPrice} = getDiscountedUnitPrice({
        promos,
        productId: i.productId,
        basePrice: i.price
      });
      return sum + unitPrice * i.qty;
    }, 0);
  }, [items, promos]);
  const effectiveDeliveryFee =
    items.length > 0 && orderType === 'Delivery' ? deliveryFee : 0;
  const total = subtotal + effectiveDeliveryFee;

  if (!isOpen) return null;

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
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now());
    close();
    router.push(`/checkout/${id}`);
  };

  const summaryText =
    orderType === 'Reservation'
      ? `${orderType}, ${reservationDate}, ${reservationTime}`
      : `${orderType}, Today, ${timing}`;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={
          'fixed bg-white shadow-2xl flex flex-col ' +
          'w-full md:w-105 ' +
          'bottom-0 md:bottom-auto md:top-0 md:right-0 ' +
          'h-[85dvh] md:h-dvh ' +
          'rounded-t-3xl md:rounded-none'
        }
        onClick={e => e.stopPropagation()}
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
          {items.length === 0 ? (
            <div className="text-sm text-gray-500 py-10 text-center">
              Your cart is empty.
            </div>
          ) : (
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
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                          {item.name}
                        </p>
                        <button
                          type="button"
                          className="mt-1 text-xs font-semibold text-[#c30010]"
                          onClick={() => removeItem(item.productId)}
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
                          onClick={() =>
                            setQty(item.productId, Math.max(1, item.qty - 1))
                          }
                          aria-label="Decrease"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <div className="min-w-10 text-center text-sm font-semibold text-gray-900">
                          {item.qty}
                        </div>
                        <button
                          type="button"
                          className="h-8 w-10 inline-flex items-center justify-center hover:bg-gray-50"
                          onClick={() => setQty(item.productId, item.qty + 1)}
                          aria-label="Increase"
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
            disabled={items.length === 0}
            onClick={goToCheckout}
          >
            Go To Checkout
          </Button>
        </div>
      </div>

      {orderDetailsOpen ? (
        <div
          className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4"
          onClick={cancelOrderDetails}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <p className="text-xl font-bold text-gray-900">Order details</p>
              <Button
                type="button"
                onClick={cancelOrderDetails}
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="px-6 py-6">
              <p className="text-sm font-semibold text-gray-900">
                Select order type
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDraftOrderType('Delivery')}
                  className={
                    'h-12 rounded-xl border px-4 inline-flex items-center justify-center gap-2 font-semibold ' +
                    (draftOrderType === 'Delivery'
                      ? 'bg-[#3c5e45] text-white'
                      : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50')
                  }
                >
                  <Bike className="h-5 w-5" />
                  Delivery
                </button>

                <button
                  type="button"
                  onClick={() => setDraftOrderType('Pick-up')}
                  className={
                    'h-12 rounded-xl border px-4 inline-flex items-center justify-center gap-2 font-semibold ' +
                    (draftOrderType === 'Pick-up'
                      ? 'bg-[#3c5e45] text-white'
                      : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50')
                  }
                >
                  <ShoppingBag className="h-5 w-5" />
                  Pick-up
                </button>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setDraftOrderType('Reservation')}
                  className={
                    'h-12 w-full rounded-xl border px-4 inline-flex items-center justify-center gap-2 font-semibold ' +
                    (draftOrderType === 'Reservation'
                      ? 'bg-[#3c5e45] text-white'
                      : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50')
                  }
                >
                  <CalendarClock className="h-5 w-5" />
                  Reservation
                </button>
              </div>

              {draftOrderType === 'Reservation' ? (
                <div className="mt-6 space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Schedule
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <input
                        type="date"
                        value={draftReservationDate}
                        onChange={e => setDraftReservationDate(e.target.value)}
                        className="h-10 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-900"
                      />
                      <input
                        type="time"
                        value={draftReservationTime}
                        onChange={e => setDraftReservationTime(e.target.value)}
                        className="h-10 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Number of Guests
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        value={draftReservationGuests}
                        onChange={e =>
                          setDraftReservationGuests(
                            Number.isFinite(Number(e.target.value))
                              ? Number(e.target.value)
                              : 1
                          )
                        }
                        className="h-10 w-28 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-900"
                      />
                      <p className="text-sm text-gray-500">guest(s)</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-5 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={cancelOrderDetails}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#c30010] text-white hover:bg-[#a6000d]"
                onClick={confirmOrderDetails}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
