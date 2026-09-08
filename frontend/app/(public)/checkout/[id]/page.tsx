'use client';

import {useMemo, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Image from 'next/image';
import {
  Banknote,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  Smartphone,
  Truck
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useCartStore, getCartSubtotal} from '@/app/store/cartStore';
import {useLocationStore} from '@/app/store/locationStore';
import {useOrderDetailsStore} from '@/app/store/orderDetailsStore';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {getDiscountedUnitPrice} from '@/lib/utils/promoPricing';
import {useCreateGuestOrderMutation} from '@/lib/hooks/orders/useGuestOrder';
import {saveGuestOrderHistoryEntry} from '@/lib/orders/orderHistoryStorage';
import {cn} from '@/lib/utils';

const STORE = {
  lat: 14.39092185435405,
  lng: 120.8530823121149
};

const NOTE_SUGGESTIONS = [
  'Call upon arrival',
  'Extra sauce on the side',
  'Leave at gate',
  'Ring the doorbell'
];

function buildMapPreviewSrc(userLat: number, userLng: number) {
  const midLat = (userLat + STORE.lat) / 2;
  const midLng = (userLng + STORE.lng) / 2;
  const spread =
    Math.abs(userLat - STORE.lat) + Math.abs(userLng - STORE.lng);
  const zoom = Math.max(5000, Math.round(spread * 80000 + 5000));

  return (
    `https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d${zoom}` +
    `!2d${midLng}!3d${midLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1` +
    `!4m13!3e0!4m5!1s0x0%3A0x0!2sYour+Location!3m2!1d${userLat}!2d${userLng}` +
    `!4m5!1s0x33962d2a919119a5%3A0xe5f912eb02ffd2f9!2sDon%20Claudio%E2%80%99s%20Lechon%20House` +
    `!3m2!1d${STORE.lat}!2d${STORE.lng}!5e0!3m2!1sen!2sus!4v1`
  );
}

const PAYMENT_OPTIONS = [
  {
    value: 'Cash' as const,
    label: 'Cash',
    description: 'Pay in cash upon delivery',
    icon: Banknote
  },
  {
    value: 'GCash' as const,
    label: 'GCash',
    description: 'Pay securely through GCash',
    icon: Smartphone
  }
];

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
  const setLocation = useLocationStore(s => s.setLocation);

  const orderType = useOrderDetailsStore(s => s.orderType);
  const reservationDate = useOrderDetailsStore(s => s.reservationDate);
  const reservationTime = useOrderDetailsStore(s => s.reservationTime);
  const setOrderType = useOrderDetailsStore(s => s.setOrderType);
  const setReservationDate = useOrderDetailsStore(s => s.setReservationDate);
  const setReservationTime = useOrderDetailsStore(s => s.setReservationTime);

  const [address, setAddress] = useState(location?.address ?? '');
  const [notesToRider, setNotesToRider] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    paymentMethod?: string;
  }>({});

  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash' | ''>('');
  const [changeFor, setChangeFor] = useState('');
  const [addressType, setAddressType] = useState<'Residential' | 'Office'>(
    'Residential'
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
  const deliveryFee = orderType === 'Delivery' && items.length > 0 ? 49 : 0;
  const total = subtotal + deliveryFee;

  const createOrderMutation = useCreateGuestOrderMutation();

  const mapPreviewSrc =
    location && location.lat != null && location.lng != null
      ? buildMapPreviewSrc(location.lat, location.lng)
      : null;

  const toggleNoteSuggestion = (suggestion: string) => {
    const value = suggestion.trim();
    if (!value) return;

    setNotesToRider(current => {
      const remaining = current
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .filter(s => s !== value)
        .join(', ');
      return remaining.length > 0 ? `${remaining}, ${value}` : value;
    });
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setLocation({
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      address: value
    });
  };

  const isNoteActive = (suggestion: string) =>
    notesToRider
      .split(',')
      .map(s => s.trim())
      .includes(suggestion);

  const handleQuickSelectPayment = (
    method: 'Cash' | 'GCash'
  ) => {
    setPaymentMethod(method);
    setErrors(current => ({...current, paymentMethod: undefined}));
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    const nextErrors: typeof errors = {};
    if (!firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!mobileNumber.trim()) {
      nextErrors.mobileNumber = 'Mobile number is required.';
    }
    if (!paymentMethod) {
      nextErrors.paymentMethod = 'Please select a payment method.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const orderItems = items.map(i => {
      const {unitPrice} = getDiscountedUnitPrice({
        promos,
        productId: i.productId,
        basePrice: i.price
      });
      return {
        productId: i.productId,
        quantity: i.qty,
        price: unitPrice,
        specialRequest: i.instructions,
        name: i.name,
        imageUrl: i.imageUrl
      };
    });

    const created = await createOrderMutation.mutateAsync({
      guestInfo: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: mobileNumber.trim(),
        address: address.trim().length ? address.trim() : undefined
      },
      orderType:
        orderType === 'Delivery'
          ? 'delivery'
          : orderType === 'Pick-up'
            ? 'pickup'
            : 'reservation',
      items: orderItems,
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
    if (orderId) {
      saveGuestOrderHistoryEntry({
        _id: orderId,
        orderType:
          orderType === 'Delivery'
            ? 'delivery'
            : orderType === 'Pick-up'
              ? 'pickup'
              : 'reservation',
        totalAmount: total,
        riderNotes: notesToRider.trim().length
          ? notesToRider.trim()
          : undefined,
        orderStatus: created.order.orderStatus,
        isGuest: true,
        guestInfo: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: mobileNumber.trim(),
          address: address.trim().length ? address.trim() : undefined
        },
        items: orderItems,
        createdAt: new Date().toISOString()
      });
    }
    clearCart();
    if (orderId) {
      router.push(`/order-confirmation/${orderId}`);
    }
  };

  const checkoutButton = (
    <Button
      type="button"
      className="w-full h-12 rounded-full bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
      disabled={items.length === 0 || createOrderMutation.isPending}
      onClick={handleCheckout}
    >
      {createOrderMutation.isPending ? 'Placing order...' : 'Checkout'}
    </Button>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
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

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 items-start gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    Delivery Details
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Let us know where and how to send your order.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#3c5e45]/10 inline-flex items-center justify-center shrink-0">
                    <Truck className="h-4 w-4 text-[#3c5e45]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Receive by</p>
                    <div className="mt-1 relative">
                      <select
                        value={orderType}
                        onChange={e =>
                          setOrderType(
                            e.target.value as
                              | 'Delivery'
                              | 'Pick-up'
                              | 'Reservation'
                          )
                        }
                        aria-label="Receive by"
                        className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2 pr-9 pl-3 text-sm font-semibold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c5e45]/30"
                      >
                        <option value="Delivery">Delivery, Today, ASAP</option>
                        <option value="Pick-up">Pick-up, Today, ASAP</option>
                        <option value="Reservation">
                          Reservation, {reservationDate}, {reservationTime}
                        </option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>

                {orderType === 'Reservation' ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        Date
                      </p>
                      <input
                        type="date"
                        value={reservationDate}
                        onChange={e => setReservationDate(e.target.value)}
                        className="mt-1 h-10 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-900"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        Time
                      </p>
                      <input
                        type="time"
                        value={reservationTime}
                        onChange={e => setReservationTime(e.target.value)}
                        className="mt-1 h-10 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-900"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="h-px bg-gray-100" />

                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#3c5e45]/10 inline-flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-[#3c5e45]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Deliver to</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      You can edit this address
                    </p>
                    <Input
                      value={address}
                      onChange={e => handleAddressChange(e.target.value)}
                      placeholder={
                        location?.address
                          ? 'Edit your delivery address'
                          : 'Enter your delivery address'
                      }
                      className="mt-2"
                    />
                  </div>
                </div>

                {mapPreviewSrc ? (
                  <div className="h-40 overflow-hidden rounded-xl border border-gray-200">
                    <iframe
                      src={mapPreviewSrc}
                      className="w-full h-full"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Delivery location map preview"
                    />
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    Address type
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {(['Residential', 'Office'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAddressType(type)}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c5e45]/30',
                          addressType === type
                            ? 'border-[#3c5e45]/30 bg-[#3c5e45]/10 text-[#3c5e45]'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                            addressType === type
                              ? 'border-[#3c5e45] bg-[#3c5e45]'
                              : 'border-gray-300 bg-white'
                          )}
                        >
                          {addressType === type ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                        {type}
                      </button>
                    ))}
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

                  <div className="mt-3 flex flex-wrap gap-2">
                    {NOTE_SUGGESTIONS.map(suggestion => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => toggleNoteSuggestion(suggestion)}
                        aria-pressed={isNoteActive(suggestion)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c5e45]/30',
                          isNoteActive(suggestion)
                            ? 'border-[#3c5e45]/30 bg-[#3c5e45]/10 text-[#3c5e45]'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  <Input
                    value={notesToRider}
                    onChange={e => setNotesToRider(e.target.value)}
                    placeholder="Notes to rider"
                    className="mt-3"
                  />

                  <button
                    type="button"
                    className="mt-4 rounded-full bg-[#3c5e45] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3c5e45]"
                  >
                    Save Details
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <div>
                <p className="text-xl font-bold text-gray-900">
                  Checkout As Guest
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Providing this information allows us to contact and update
                  you about your order.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    First Name
                  </p>
                  <Input
                    value={firstName}
                    onChange={e => {
                      setFirstName(e.target.value);
                      setErrors(current => ({
                        ...current,
                        firstName: undefined
                      }));
                    }}
                    placeholder="Your First Name"
                    className="mt-2"
                  />
                  {errors.firstName ? (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {errors.firstName}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    Last Name
                  </p>
                  <Input
                    value={lastName}
                    onChange={e => {
                      setLastName(e.target.value);
                      setErrors(current => ({...current, lastName: undefined}));
                    }}
                    placeholder="Your Last Name"
                    className="mt-2"
                  />
                  {errors.lastName ? (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {errors.lastName}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-700">
                  Mobile Number
                </p>
                <Input
                  value={mobileNumber}
                  onChange={e => {
                    setMobileNumber(e.target.value);
                    setErrors(current => ({
                      ...current,
                      mobileNumber: undefined
                    }));
                  }}
                  placeholder="+63"
                  className="mt-2"
                />
                {errors.mobileNumber ? (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {errors.mobileNumber}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    Payment details
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Choose how you&apos;d like to pay.
                  </p>
                </div>
                <CreditCard className="h-5 w-5 text-[#3c5e45]" />
              </div>

              <div className="mt-5 space-y-3">
                {PAYMENT_OPTIONS.map(option => {
                  const Icon = option.icon;
                  const selected = paymentMethod === option.value;

                  return (
                    <div
                      key={option.value}
                      className={cn(
                        'rounded-xl border transition-colors',
                        selected
                          ? 'border-[#3c5e45]/30 bg-[#3c5e45]/5'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickSelectPayment(option.value)
                        }
                        aria-pressed={selected}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c5e45]/30 rounded-xl"
                      >
                        <span
                          className={cn(
                            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                            selected
                              ? 'border-[#3c5e45] bg-[#3c5e45]'
                              : 'border-gray-300 bg-white'
                          )}
                        >
                          {selected ? (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          ) : null}
                        </span>
                        <span className="h-9 w-9 shrink-0 rounded-full bg-[#3c5e45]/10 inline-flex items-center justify-center">
                          <Icon className="h-4 w-4 text-[#3c5e45]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-gray-900">
                            {option.label}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {option.description}
                          </span>
                        </span>
                      </button>

                      {selected && option.value === 'Cash' ? (
                        <div className="px-4 pb-4">
                          <p className="text-xs font-semibold text-gray-700">
                            Change for
                            <span className="ml-1 font-normal text-gray-500">
                              (optional)
                            </span>
                          </p>
                          <Input
                            value={changeFor}
                            onChange={e => setChangeFor(e.target.value)}
                            placeholder="e.g. ₱1,000.00"
                            inputMode="numeric"
                            className="mt-2"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {errors.paymentMethod ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.paymentMethod}
                </p>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-1 lg:sticky lg:top-[85px]">
            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-gray-900">Order summary</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-[#3c5e45] hover:underline"
                  onClick={() => router.push('/order')}
                >
                  Add items
                </button>
              </div>

              <div className="mt-5 space-y-5">
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
                        className="flex items-start gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
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
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-gray-900 line-clamp-2">
                              {item.name}
                            </p>
                            <p className="shrink-0 text-sm font-extrabold text-gray-900">
                              ₱{unitPrice * item.qty}.00
                            </p>
                          </div>

                          <div className="mt-0.5">
                            <p className="text-xs text-gray-500">
                              ₱{unitPrice}.00 each
                            </p>
                            {isDiscounted ? (
                              <p className="text-[11px] text-gray-400 line-through">
                                ₱{item.price}.00
                              </p>
                            ) : null}
                          </div>

                          {item.instructions ? (
                            <p className="mt-1 text-xs text-gray-500 italic">
                              “{item.instructions}”
                            </p>
                          ) : null}

                          <div className="mt-2 inline-flex items-center rounded-full border border-gray-200 overflow-hidden">
                            <button
                              type="button"
                              className="h-8 w-10 inline-flex items-center justify-center hover:bg-gray-50"
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
                            <div className="min-w-9 text-center text-base font-bold text-gray-900">
                              {item.qty}
                            </div>
                            <button
                              type="button"
                              className="h-8 w-10 inline-flex items-center justify-center hover:bg-gray-50"
                              onClick={() =>
                                setQty(item.productId, item.qty + 1)
                              }
                              aria-label="Increase"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold">₱{subtotal}.00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span className="text-gray-500">Delivery fee</span>
                    <span className="font-semibold">₱{deliveryFee}.00</span>
                  </div>
                </div>

                <div className="h-px bg-gray-200" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">
                    Total
                  </span>
                  <span className="text-2xl font-extrabold text-gray-900">
                    ₱{total}.00
                  </span>
                </div>

                <div className="hidden lg:block">{checkoutButton}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-extrabold text-gray-900">
              ₱{total}.00
            </p>
          </div>
          <div className="flex-1">{checkoutButton}</div>
        </div>
      </div>
    </div>
  );
}