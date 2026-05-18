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
import {useLocationStore} from '@/app/store/locationStore';
import {useOrderDetailsStore} from '@/app/store/orderDetailsStore';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {getDiscountedUnitPrice} from '@/lib/utils/promoPricing';
import {
  useClearCustomerCartMutation,
  useCustomerCartQuery,
  useSetCustomerCartItemQuantityMutation
} from '@/lib/hooks/cart/useCustomerCart';
import {useCreateCustomerOrderMutation} from '@/lib/hooks/orders/useCustomerOrder';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';

function getProductId(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '_id' in value) {
    return String((value as {_id: unknown})._id);
  }
  return String(value);
}

export default function CustomerCheckoutPage() {
  const params = useParams<{id: string}>();
  const router = useRouter();

  const cartQuery = useCustomerCartQuery(true);
  const meQuery = useMeQuery();
  const customer = meQuery.data?.user;
  const items = useMemo(
    () => cartQuery.data?.cart?.items ?? [],
    [cartQuery.data]
  );

  const setQtyMutation = useSetCustomerCartItemQuantityMutation();
  const clearCartMutation = useClearCustomerCartMutation();
  const createOrderMutation = useCreateCustomerOrderMutation();

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
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash' | ''>('');
  const [draftPaymentMethod, setDraftPaymentMethod] = useState<
    'Cash' | 'GCash' | ''
  >('');
  const [paymentError, setPaymentError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  const subtotal = useMemo(() => {
    if (promos.length === 0) {
      return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }

    return items.reduce((sum, i) => {
      const {unitPrice} = getDiscountedUnitPrice({
        promos,
        productId: getProductId(i.productId),
        basePrice: i.price
      });
      return sum + unitPrice * i.quantity;
    }, 0);
  }, [items, promos]);

  const deliveryFee = orderType === 'Delivery' && items.length > 0 ? 49 : 0;
  const total = subtotal + deliveryFee;

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
    setPaymentError('');
    setPaymentModalOpen(false);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!paymentMethod) {
      setPaymentError('Please select a payment method.');
      return;
    }

    setCheckoutError('');

    try {
      const created = await createOrderMutation.mutateAsync({
        orderType:
          orderType === 'Delivery'
            ? 'delivery'
            : orderType === 'Pick-up'
              ? 'pickup'
              : 'reservation',
        items: items.map(i => {
          const {unitPrice} = getDiscountedUnitPrice({
            promos,
            productId: getProductId(i.productId),
            basePrice: i.price
          });
          return {
            productId: getProductId(i.productId),
            quantity: i.quantity,
            price: unitPrice
          };
        }),
        totalAmount: total,
        riderNotes: notesToRider.trim().length
          ? notesToRider.trim()
          : undefined,
        paymentMethod: paymentMethod === 'GCash' ? 'gcash' : 'cash'
      });

      const orderId = created?.order?._id;
      await clearCartMutation.mutateAsync();
      if (orderId) {
        router.push(`/customer/dashboard/order-confirmation/${orderId}`);
      }
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as {message?: unknown}).message)
          : 'Failed to place order. Please try again.';
      setCheckoutError(message);
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
              <p className="text-lg font-bold text-gray-900">Account Details</p>
              <p className="text-xs text-gray-500 mt-1">
                We will use your saved account information for this order.
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Name</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {[customer?.firstName, customer?.lastName]
                      .filter(Boolean)
                      .join(' ') || 'No name saved'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    Mobile Number
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {customer?.phoneNumber || 'No mobile number saved'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-gray-700">Email</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {customer?.email || 'No email saved'}
                  </p>
                </div>
              </div>
            </div>

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
                </div>
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
              {paymentError ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {paymentError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white p-5 shadow">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-gray-900">Order summary</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-[#3c5e45]"
                  onClick={() => router.push('/customer/dashboard')}
                >
                  Add items
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {cartQuery.isLoading ? (
                  <p className="text-sm text-gray-500">Loading cart...</p>
                ) : items.length === 0 ? (
                  <p className="text-sm text-gray-500">Your cart is empty.</p>
                ) : (
                  items.map(item => {
                    const {unitPrice} = getDiscountedUnitPrice({
                      promos,
                      productId: getProductId(item.productId),
                      basePrice: item.price
                    });
                    const isDiscounted = unitPrice < item.price;

                    return (
                      <div
                        key={getProductId(item.productId)}
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
                            sizes="48px"
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
                                  setQtyMutation.mutate({
                                    productId: getProductId(item.productId),
                                    quantity: Math.max(1, item.quantity - 1)
                                  })
                                }
                                aria-label="Decrease"
                                disabled={setQtyMutation.isPending}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <div className="min-w-9 text-center text-sm font-semibold text-gray-900">
                                {item.quantity}
                              </div>
                              <button
                                type="button"
                                className="h-7 w-9 inline-flex items-center justify-center hover:bg-gray-50"
                                onClick={() =>
                                  setQtyMutation.mutate({
                                    productId: getProductId(item.productId),
                                    quantity: item.quantity + 1
                                  })
                                }
                                aria-label="Increase"
                                disabled={setQtyMutation.isPending}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <p className="text-sm font-bold text-gray-900">
                              ₱{unitPrice * item.quantity}.00
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
                  disabled={
                    items.length === 0 ||
                    createOrderMutation.isPending ||
                    clearCartMutation.isPending
                  }
                  onClick={handleCheckout}
                >
                  {createOrderMutation.isPending
                    ? 'Placing order...'
                    : 'Checkout'}
                </Button>
                {checkoutError ? (
                  <p className="text-center text-xs font-medium text-red-600">
                    {checkoutError}
                  </p>
                ) : null}
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
