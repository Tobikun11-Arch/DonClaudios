'use client';

import {useMemo, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Image from 'next/image';
import {
  ChevronLeft,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  Truck,
  X
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useCartStore, getCartSubtotal} from '@/app/store/cartStore';
import {useLocationStore} from '@/app/store/locationStore';
import {useOrderDetailsStore} from '@/app/store/orderDetailsStore';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {getDiscountedUnitPrice} from '@/lib/utils/promoPricing';
import {useCreateGuestOrderMutation} from '@/lib/hooks/orders/useGuestOrder';

export default function CheckoutGuestPage() {
  const params = useParams<{id: string}>();
  const router = useRouter();

  const items = useCartStore(s => s.items);
  const setQty = useCartStore(s => s.setQty);
  const clearCart = useCartStore(s => s.clear);

  const promosQuery = usePublicPromosQuery();
  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data]
  );

  const location = useLocationStore(s => s.location);

  const orderType = useOrderDetailsStore(s => s.orderType);
  const timing = useOrderDetailsStore(s => s.timing);
  const reservationDate = useOrderDetailsStore(s => s.reservationDate);
  const reservationTime = useOrderDetailsStore(s => s.reservationTime);

  const [notesToRider, setNotesToRider] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash' | ''>('');
  const [draftPaymentMethod, setDraftPaymentMethod] = useState<
    'Cash' | 'GCash' | ''
  >('');

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
  const deliveryFee = orderType === 'Delivery' && items.length > 0 ? 49 : 0;
  const total = subtotal + deliveryFee;

  const createOrderMutation = useCreateGuestOrderMutation();

  const receiveByText =
    orderType === 'Reservation'
      ? `${orderType}, ${reservationDate}, ${reservationTime}`
      : `${orderType}, Today, ${timing}`;

  const openPaymentModal = () => {
    setDraftPaymentMethod(paymentMethod);
    setPaymentModalOpen(true);
  };

  const cancelPaymentModal = () => {
    setPaymentModalOpen(false);
  };

  const confirmPaymentModal = () => {
    setPaymentMethod(draftPaymentMethod);
    setPaymentModalOpen(false);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    const created = await createOrderMutation.mutateAsync({
      guestInfo: {
        firstName,
        lastName,
        phoneNumber: mobileNumber,
        address: location?.address ?? undefined
      },
      orderType:
        orderType === 'Delivery'
          ? 'delivery'
          : orderType === 'Pick-up'
            ? 'pickup'
            : 'reservation',
      items: items.map(i => {
        const {unitPrice} = getDiscountedUnitPrice({
          promos,
          productId: i.productId,
          basePrice: i.price
        });
        return {
          productId: i.productId,
          quantity: i.qty,
          price: unitPrice,
          specialRequest: i.instructions
        };
      }),
      totalAmount: total,
      riderNotes: notesToRider.trim().length ? notesToRider.trim() : undefined,
      paymentMethod:
        paymentMethod === 'GCash'
          ? 'gcash'
          : paymentMethod === 'Cash'
            ? 'cash'
            : undefined
    });

    const orderId = created?.order?._id;
    clearCart();
    if (orderId) {
      router.push(`/order-confirmation/${orderId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-[#3c5e45] hover:text-[#3c5e45] hover:bg-[#3c5e45]/10"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Back
          </Button>

          <p className="text-sm font-semibold text-[#3c5e45]">
            Checkout #{params?.id ?? ''}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-lg font-bold text-gray-900">
                Delivery Details
              </p>

              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#3c5e45]/10 inline-flex items-center justify-center">
                    <Truck className="h-4 w-4 text-[#3c5e45]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Receive by</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {receiveByText}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#3c5e45]/10 inline-flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-[#3c5e45]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Deliver to</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {location?.address ?? 'No saved location'}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Additional details
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Delivery instructions (optional)
                  </p>
                  <Input
                    value={notesToRider}
                    onChange={e => setNotesToRider(e.target.value)}
                    placeholder="Notes to rider"
                    className="mt-3"
                  />

                  <Button
                    type="button"
                    className="mt-4 bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
                  >
                    Save Details
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-lg font-bold text-gray-900">
                Checkout As Guest
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Providing this information allows us to contact and update you
                about your order.
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    First Name
                  </p>
                  <Input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Your First Name"
                    className="mt-2"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    Last Name
                  </p>
                  <Input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Your Last Name"
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-700">
                  Mobile Number
                </p>
                <Input
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                  placeholder="+63"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-lg font-bold text-gray-900">Payment details</p>

              <button
                type="button"
                className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-4 hover:bg-gray-50"
                onClick={openPaymentModal}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#3c5e45]/10 inline-flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-[#3c5e45]" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-gray-500">Payment method</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {paymentMethod || 'Select'}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-[#3c5e45]">Select</p>
                </div>
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white p-5 shadow">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-gray-900">Order summary</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-[#3c5e45]"
                  onClick={() => router.push('/order')}
                >
                  Add items
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {items.length === 0 ? (
                  <p className="text-sm text-gray-500">Your cart is empty.</p>
                ) : (
                  items.map(item => {
                    const {unitPrice} = getDiscountedUnitPrice({
                      promos,
                      productId: item.productId,
                      basePrice: item.price
                    });
                    const isDiscounted = unitPrice < item.price;

                    return (
                      <div
                        key={item.productId}
                        className="flex items-start gap-3"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-50">
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
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                            {item.name}
                          </p>

                          <div className="mt-0.5">
                            <p className="text-xs text-gray-500">
                              ₱{unitPrice}.00
                            </p>
                            {isDiscounted ? (
                              <p className="text-[11px] text-gray-400 line-through">
                                ₱{item.price}.00
                              </p>
                            ) : null}
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-full border border-gray-200 overflow-hidden">
                              <button
                                type="button"
                                className="h-7 w-9 inline-flex items-center justify-center hover:bg-gray-50"
                                onClick={() =>
                                  setQty(
                                    item.productId,
                                    Math.max(1, item.qty - 1)
                                  )
                                }
                                aria-label="Decrease"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <div className="min-w-9 text-center text-sm font-semibold text-gray-900">
                                {item.qty}
                              </div>
                              <button
                                type="button"
                                className="h-7 w-9 inline-flex items-center justify-center hover:bg-gray-50"
                                onClick={() =>
                                  setQty(item.productId, item.qty + 1)
                                }
                                aria-label="Increase"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <p className="text-sm font-bold text-gray-900">
                              ₱{unitPrice * item.qty}.00
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-semibold">₱{subtotal}.00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span>Delivery fee</span>
                    <span className="font-semibold">₱{deliveryFee}.00</span>
                  </div>

                  <div className="h-px bg-gray-100" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      Total
                    </span>
                    <span className="text-base font-extrabold text-gray-900">
                      ₱{total}.00
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full h-12 rounded-full bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
                  disabled={items.length === 0 || createOrderMutation.isPending}
                  onClick={handleCheckout}
                >
                  {createOrderMutation.isPending
                    ? 'Placing order...'
                    : 'Checkout'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {paymentModalOpen ? (
        <div
          className="fixed inset-0 z-90 bg-black/40 flex items-center justify-center p-4"
          onClick={cancelPaymentModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <p className="text-lg font-bold text-gray-900">Payment method</p>
              <Button
                type="button"
                onClick={cancelPaymentModal}
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="px-6 py-6 space-y-3">
              <button
                type="button"
                className={
                  'w-full h-12 rounded-xl border px-4 text-left font-semibold ' +
                  (draftPaymentMethod === 'Cash'
                    ? 'bg-[#3c5e45] text-white'
                    : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50')
                }
                onClick={() => setDraftPaymentMethod('Cash')}
              >
                Cash
              </button>
              <button
                type="button"
                className={
                  'w-full h-12 rounded-xl border px-4 text-left font-semibold ' +
                  (draftPaymentMethod === 'GCash'
                    ? 'bg-[#3c5e45] text-white'
                    : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50')
                }
                onClick={() => setDraftPaymentMethod('GCash')}
              >
                GCash
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-5 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={cancelPaymentModal}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
                onClick={confirmPaymentModal}
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
