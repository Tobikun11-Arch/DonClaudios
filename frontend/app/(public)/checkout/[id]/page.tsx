'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Image from 'next/image';
import {
  BadgeCheck,
  ChevronLeft,
  CreditCard,
  Loader2,
  MapPin,
  Minus,
  Plus
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator
} from '@/components/ui/input-otp';
import {useCartStore, getCartSubtotal} from '@/app/store/cartStore';
import {useLocationStore} from '@/app/store/locationStore';
import {useOrderDetailsStore} from '@/app/store/orderDetailsStore';
import LocationPicker from '@/features/order/components/LocationPicker';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import {getDiscountedUnitPrice} from '@/lib/utils/promoPricing';
import {
  GUEST_MAX_ORDER_MESSAGE,
  GUEST_MAX_ORDER_TOTAL,
  MIN_ORDER_MESSAGE,
  MIN_ORDER_TOTAL,
  wouldExceedGuestMax
} from '@/lib/constants/orderLimits';
import {STORE_ADDRESS} from '@/lib/orders/deliveryMode';
import {useFreeDeliveryStatus} from '@/lib/orders/useFreeDeliveryStatus';
import FreeDeliveryHint from '@/features/order/components/FreeDeliveryHint';
import CourierPicker, {
  isCourierChoiceComplete,
  type CourierChoice
} from '@/features/order/components/CourierPicker';
import OrderTypeSelector from '@/shared/components/order/OrderTypeSelector';
import {useCreateGuestOrderMutation} from '@/lib/hooks/orders/useGuestOrder';
import {useStoreStatusQuery} from '@/lib/hooks/useStoreStatus';
import {
  getGuestOtpStatus,
  sendGuestOtp,
  verifyGuestOtp,
  sendGuestEmailOtp,
  verifyGuestEmailOtp,
  getGuestEmailOtpStatus
} from '@/lib/api/orderApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {sanitizePhone, sanitizeName} from '@/lib/validation/numeric';
import {normalizePH, detectCarrier, toAppCarrier} from '@/lib/phone';
import {cn} from '@/lib/utils';
import {enterNavigation} from '@/shared/utils/enterNavigation';
import {HeardFromPicker} from '@/features/customer/components/HeardFromPicker';
import {ORDER_NOTES_COPY, hasNote, keepNotesFor, toggleNote} from '@/lib/orders/orderNotes';
import {CheckoutPaymentNote} from '@/features/order/components/CheckoutPaymentNote';
import OrderTimingPicker, {
  DEFAULT_TIMING,
  timingProblem,
  type TimingSelection
} from '@/features/order/components/OrderTimingPicker';
import {CheckoutOrderNotices} from '@/features/order/components/OrderNotices';
import type {ScheduleQuote} from '@/lib/orders/orderSchedule';

const STORE = {
  lat: 14.39092185435405,
  lng: 120.8530823121149
};


function buildMapPreviewSrc(userLat: number, userLng: number) {
  const midLat = (userLat + STORE.lat) / 2;
  const midLng = (userLng + STORE.lng) / 2;
  const spread = Math.abs(userLat - STORE.lat) + Math.abs(userLng - STORE.lng);
  const zoom = Math.max(5000, Math.round(spread * 80000 + 5000));

  return (
    `https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d${zoom}` +
    `!2d${midLng}!3d${midLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1` +
    `!4m13!3e0!4m5!1s0x0%3A0x0!2sYour+Location!3m2!1d${userLat}!2d${userLng}` +
    `!4m5!1s0x33962d2a919119a5%3A0xe5f912eb02ffd2f9!2sDon%20Claudio%E2%80%99s%20Lechon%20House` +
    `!3m2!1d${STORE.lat}!2d${STORE.lng}!5e0!3m2!1sen!2sus!4v1`
  );
}

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
  const setOrderType = useOrderDetailsStore(s => s.setOrderType);

  const [address, setAddress] = useState(location?.address ?? '');
  // ASAP or a pre-order slot (bulk / lechon carts must pre-order).
  const [timing, setTiming] = useState<TimingSelection>(DEFAULT_TIMING);
  const [scheduleQuote, setScheduleQuote] = useState<ScheduleQuote | undefined>();
  const onQuote = useCallback((q: ScheduleQuote | undefined) => setScheduleQuote(q), []);
  const [notesToRider, setNotesToRider] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // Trade-off: guests verified via email (Smart/TNT) do not have a verified
  // phone number at checkout, so security is slightly weaker for this group.
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  // Anti-spam: a hidden honeypot field bots tend to fill, and the time the
  // form was opened (the server rejects instant, script-speed submissions).
  const [honeypot, setHoneypot] = useState('');
  const [formStartedAt] = useState(() => Date.now());
  const normalizedPhone = normalizePH(mobileNumber);
  const detectedCarrier = normalizedPhone
    ? detectCarrier(normalizedPhone)
    : 'unknown';
  const carrier: 'globe_dito' | 'smart_tnt' | null = normalizedPhone
    ? toAppCarrier(detectedCarrier)
    : null;
  const [otpCode, setOtpCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    email?: string;
  }>({});

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
  const productsQuery = useProductsQuery();
  const productCategoryById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of productsQuery.data?.products ?? [])
      map.set(p._id, p.category);
    return map;
  }, [productsQuery.data]);

  const deliveryItems = useMemo(
    () =>
      items.map(i => ({
        category: productCategoryById.get(i.productId),
        price: i.price,
        quantity: i.qty
      })),
    [items, productCategoryById]
  );
  // Guests always book their own courier: free delivery is for customers with an
  // account (inside Tanza). The hint below tells them so.
  const freeDelivery = useFreeDeliveryStatus(deliveryItems, 'guest', null);
  const deliveryMode = freeDelivery.mode;
  const [courier, setCourier] = useState<CourierChoice>({provider: null, name: ''});
  // A delivery the customer books themself needs to say which courier, so
  // the store knows which rider to expect.
  const needsCourier = orderType === 'Delivery' && deliveryMode === 'LALAMOVE';
  const courierMissing = needsCourier && !isCourierChoiceComplete(courier);
  const courierPayload =
    needsCourier && courier.provider
      ? {
          provider: courier.provider,
          name: courier.provider === 'other' ? courier.name.trim() : undefined
        }
      : undefined;

  const total = subtotal;
  const belowMinimum = items.length > 0 && total < MIN_ORDER_TOTAL;
  const overGuestMax = total > GUEST_MAX_ORDER_TOTAL;

  const createOrderMutation = useCreateGuestOrderMutation();

  const storeStatusQuery = useStoreStatusQuery();
  // A closed store only blocks ASAP orders; pre-orders pick an open slot.
  const isStoreClosed =
    storeStatusQuery.data?.status.isOpen === false && timing.timing === 'asap';

  const scheduleItems = useMemo(
    () => items.map(i => ({productId: i.productId, quantity: i.qty})),
    [items]
  );
  const timingIssue = timingProblem(timing, scheduleQuote);
  const selectedSlotAt =
    timing.timing === 'scheduled'
      ? scheduleQuote?.days
          .find(d => d.day === timing.day)
          ?.slots.find(s => s.time === timing.time)?.at ?? null
      : null;
  const storeClosedReason =
    storeStatusQuery.data?.status.isOpen === false
      ? storeStatusQuery.data.status.isManuallyClosed
        ? 'Store is temporarily closed'
        : storeStatusQuery.data.status.reason
      : '';

  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const mapPreviewSrc =
    location && location.lat != null && location.lng != null
      ? buildMapPreviewSrc(location.lat, location.lng)
      : null;

  const toggleNoteSuggestion = (suggestion: string) => {
    setNotesToRider(current => toggleNote(current, suggestion));
  };

  // Switching how the order is received drops the other type's chip notes
  // (e.g. "Leave at gate" makes no sense for a pick-up).
  const [notesOrderType, setNotesOrderType] = useState(orderType);
  if (notesOrderType !== orderType) {
    setNotesOrderType(orderType);
    setNotesToRider(current => keepNotesFor(current, orderType));
  }
  const notesCopy = ORDER_NOTES_COPY[orderType] ?? ORDER_NOTES_COPY.Delivery;

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setLocation({
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      address: value
    });
  };

  const isNoteActive = (suggestion: string) => hasNote(notesToRider, suggestion);

  const isLikelyValidPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return (
      (digits.startsWith('63') && digits.length === 12) ||
      (digits.startsWith('0') && digits.length === 11)
    );
  };

  useEffect(() => {
    if (carrier !== 'globe_dito') return;
    if (!isLikelyValidPhone(mobileNumber)) {
      setPhoneVerified(false);
      return;
    }

    setPhoneVerified(false);
    const timer = setTimeout(async () => {
      try {
        const res = await getGuestOtpStatus(mobileNumber.trim());
        if (res.verified) {
          setPhoneVerified(true);
          setOtpMessage('Your phone number is already verified.');
        }
      } catch {
        // ignore status check failures
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [mobileNumber, carrier]);

  useEffect(() => {
    if (carrier !== 'smart_tnt') return;
    if (!email.trim() || !email.includes('@')) {
      setPhoneVerified(false);
      return;
    }

    setPhoneVerified(false);
    const timer = setTimeout(async () => {
      try {
        const res = await getGuestEmailOtpStatus(email.trim());
        if (res.verified) {
          setPhoneVerified(true);
          setOtpMessage('Your email is already verified.');
        }
      } catch {
        // ignore status check failures
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [email, carrier]);

  useEffect(() => {
    if (!codeSentAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [codeSentAt]);

  const cooldownLeft = codeSentAt
    ? Math.max(0, 60 - Math.floor((now - codeSentAt) / 1000))
    : 0;

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setOtpError(null);
    setOtpMessage(null);
    try {
      if (carrier === 'smart_tnt') {
        const mail = email.trim();
        if (!mail) {
          setErrors(current => ({...current, email: 'Email is required.'}));
          return;
        }
        const res = await sendGuestEmailOtp(mail);
        if (res.alreadyVerified) {
          setPhoneVerified(true);
          setOtpMessage('Your email is already verified.');
        } else {
          setCodeSentAt(Date.now());
          setOtpMessage(
            'A 6-digit code was sent to your email. It expires in 5 minutes.'
          );
        }
      } else {
        const phone = mobileNumber.trim();
        if (!phone) {
          setErrors(current => ({
            ...current,
            mobileNumber: 'Mobile number is required.'
          }));
          return;
        }
        const res = await sendGuestOtp(phone);
        if (res.alreadyVerified) {
          setPhoneVerified(true);
          setOtpMessage('Your phone number is already verified.');
        } else {
          setCodeSentAt(Date.now());
          setOtpMessage(
            'A 6-digit code was sent to your phone. It expires in 5 minutes.'
          );
        }
      }
    } catch (error) {
      setOtpError(
        getFriendlyErrorMessage(error, 'Failed to send the code. Try again.')
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setIsVerifyingOtp(true);
    setOtpError(null);
    setOtpMessage(null);
    try {
      if (carrier === 'smart_tnt') {
        await verifyGuestEmailOtp(email.trim(), otpCode);
      } else {
        await verifyGuestOtp(mobileNumber.trim(), otpCode);
      }
      setPhoneVerified(true);
      setOtpMessage(
        carrier === 'smart_tnt'
          ? 'Your email has been verified.'
          : 'Your phone number has been verified.'
      );
    } catch (error) {
      setOtpError(
        getFriendlyErrorMessage(error, 'Verification failed. Try again.')
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setCheckoutError(null);

    if (isStoreClosed) {
      setCheckoutError(storeClosedReason || 'Store is currently closed.');
      return;
    }

    if (total < MIN_ORDER_TOTAL) {
      setCheckoutError(MIN_ORDER_MESSAGE);
      return;
    }

    if (total > GUEST_MAX_ORDER_TOTAL) {
      setCheckoutError(GUEST_MAX_ORDER_MESSAGE);
      return;
    }

    if (timingIssue) {
      setCheckoutError(timingIssue);
      return;
    }
    const nextErrors: typeof errors = {};
    if (!firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!mobileNumber.trim()) {
      nextErrors.mobileNumber = 'Mobile number is required.';
    }

    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (carrier === 'smart_tnt' && !phoneVerified) {
      nextErrors.email = 'Please verify your email before placing the order.';
    } else if (carrier !== 'smart_tnt' && !phoneVerified) {
      nextErrors.mobileNumber =
        'Please verify your phone number before placing the order.';
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

    let created;
    try {
      created = await createOrderMutation.mutateAsync({
        guestInfo: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: mobileNumber.trim(),
          email: email.trim().length ? email.trim() : undefined,
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
        courier: courierPayload,
        timing: timing.timing,
        scheduledDate: timing.timing === 'scheduled' ? timing.day ?? undefined : undefined,
        scheduledTime: timing.timing === 'scheduled' ? timing.time ?? undefined : undefined,
        website: honeypot,
        formStartedAt
      });
    } catch (error) {
      setCheckoutError(
        getFriendlyErrorMessage(
          error,
          'Failed to place your order. Please try again.'
        )
      );
      return;
    }

    const orderId = created?.order?._id;
    clearCart();
    if (orderId) {
      window.location.assign(`/order-confirmation/${orderId}`);
    }
  };

  const checkoutButton = (
    <div className="space-y-2">
      <Button
        type="button"
        data-enter-submit="focus"
        className="w-full h-12 rounded-full bg-[#3c5e45] text-white shadow-lg shadow-[#3c5e45]/25 hover:bg-[#3c5e45]"
        disabled={
          items.length === 0 ||
          belowMinimum ||
          overGuestMax ||
          courierMissing ||
          !phoneVerified ||
          isStoreClosed ||
          Boolean(timingIssue) ||
          createOrderMutation.isPending ||
          carrier === null ||
          (orderType === 'Delivery' && !address.trim())
        }
        onClick={handleCheckout}
      >
        {createOrderMutation.isPending
          ? 'Placing order...'
          : isStoreClosed
            ? 'Store is Closed'
            : timing.timing === 'scheduled'
              ? 'Place pre-order'
              : 'Place order'}
      </Button>
      {isStoreClosed ? (
        <p className="text-center text-xs font-medium text-[#c30010]">
          {storeClosedReason || 'Store is currently closed.'} You can still
          pre-order for a later time.
        </p>
      ) : checkoutError ? (
        <p className="ux-enter text-center text-xs font-medium text-[#c30010]">
          {checkoutError}
        </p>
      ) : overGuestMax ? (
        <p className="text-center text-xs font-medium text-[#c30010]">
          {GUEST_MAX_ORDER_MESSAGE}
        </p>
      ) : belowMinimum ? (
        <p className="text-center text-xs font-medium text-[#c30010]">
          {MIN_ORDER_MESSAGE}
        </p>
      ) : !phoneVerified && mobileNumber.trim() ? (
        <p className="text-center text-xs font-medium text-gray-500">
          Verify your phone number to place your order.
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0" onKeyDown={enterNavigation}>
      <div className="w-full max-w-6xl mx-auto px-4 py-12">
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
          <div className="ux-stagger-section lg:col-span-2 space-y-6">
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
                <div>
                  <p className="text-xs text-gray-500 mb-2">Receive by</p>
                  <OrderTypeSelector
                    value={orderType}
                    onChange={setOrderType}
                    deliverySubtitle={
                      deliveryMode === 'LALAMOVE'
                        ? 'Book your own courier'
                        : "Free delivery by DonClaudio's"
                    }
                  />
                </div>

                <OrderTimingPicker
                  orderType={orderType}
                  items={scheduleItems}
                  value={timing}
                  onChange={setTiming}
                  onQuote={onQuote}
                />
                {timingIssue && items.length > 0 ? (
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{timingIssue}</p>
                ) : null}

                {orderType === 'Delivery' ? (
                  <div
                    className={
                      deliveryMode === 'LALAMOVE'
                        ? 'rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'
                        : 'rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900'
                    }
                  >
                    {deliveryMode === 'LALAMOVE' ? (
                      <>
                        <div className="mb-3 rounded-xl bg-white/70 p-3 dark:bg-gray-900/60">
                          <CourierPicker value={courier} onChange={setCourier} />
                          {courierMissing ? (
                            <p className="mt-2 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                              Choose a courier to place your order.
                            </p>
                          ) : null}
                        </div>
                        <p className="font-semibold">
                          You&apos;ll book and pay for your own courier. Use the pick-up address below when booking.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigator.clipboard?.writeText(STORE_ADDRESS)
                            }
                            className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Copy address
                          </button>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              STORE_ADDRESS
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-amber-600 px-3 py-1.5 text-xs font-semibold text-amber-700"
                          >
                            Open in Google Maps
                          </a>
                        </div>
                        <div className="mt-3 h-40 overflow-hidden rounded-xl border border-amber-200">
                          <iframe
                            src={`https://maps.google.com/maps?q=${STORE.lat},${STORE.lng}&z=15&output=embed`}
                            className="w-full h-full"
                            loading="lazy"
                            title="DonClaudio's pick-up location"
                          />
                        </div>
                        <p className="mt-2 text-xs">
                          Pick-up address for rider:{' '}
                          <span className="font-semibold">{STORE_ADDRESS}</span>
                        </p>
                      </>
                    ) : (
                      <p className="font-semibold">
                        Free delivery by DonClaudio&apos;s 🎉
                      </p>
                    )}
                  </div>
                ) : null}

                {orderType === 'Delivery' ? (
                  <FreeDeliveryHint status={freeDelivery} />
                ) : null}

                {orderType === 'Pick-up' ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-semibold text-gray-700">
                        Pick up at
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        DonClaudio&apos;s Lechon House
                      </p>
                      <p className="text-xs text-gray-600">{STORE_ADDRESS}</p>
                    </div>
                  </div>
                ) : null}

                {orderType === 'Reservation' ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold text-gray-700">Dine in at</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      DonClaudio&apos;s Lechon House
                    </p>
                    <p className="text-xs text-gray-600">{STORE_ADDRESS}</p>
                  </div>
                ) : null}

                {orderType === 'Delivery' ? (
                  <>
                    <div className="h-px bg-gray-100" />

                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#3c5e45]/10 inline-flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-[#3c5e45]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500">Deliver to (Customer address)</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          For your courier booking and our records
                        </p>
                        <Input
                          required
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
                  </>
                ) : null}

                {orderType === 'Delivery' && mapPreviewSrc ? (
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

                {orderType === 'Delivery' && !location?.lat ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                    <p className="mb-3 text-xs font-semibold text-gray-700">
                      Set your delivery location
                    </p>
                    <LocationPicker
                      onConfirm={loc => {
                        setLocation(loc);
                        setAddress(loc.address);
                      }}
                    />
                  </div>
                ) : null}

                {orderType === 'Delivery' ? (
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
                ) : null}

                <div className="h-px bg-gray-100" />

                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Additional details
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {notesCopy.hint}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {notesCopy.suggestions.map(suggestion => (
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
                    placeholder={notesCopy.placeholder}
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
                  Providing this information allows us to contact and update you
                  about your order.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    First Name
                  </p>
                  <Input
                    required
                    value={firstName}
                    onChange={e => {
                       setFirstName(sanitizeName(e.target.value));
                      setErrors(current => ({
                        ...current,
                        firstName: undefined
                      }));
                    }}
                    placeholder="Your First Name"
                    autoComplete="given-name"
                    aria-invalid={errors.firstName ? true : undefined}
                    className={cn('mt-2', errors.firstName && 'ux-shake')}
                  />
                  {errors.firstName ? (
                    <p className="ux-enter mt-1 text-xs font-medium text-red-600">
                      {errors.firstName}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    Last Name
                  </p>
                  <Input
                    required
                    value={lastName}
                    onChange={e => {
                       setLastName(sanitizeName(e.target.value));
                      setErrors(current => ({...current, lastName: undefined}));
                    }}
                    placeholder="Your Last Name"
                    autoComplete="family-name"
                    aria-invalid={errors.lastName ? true : undefined}
                    className={cn('mt-2', errors.lastName && 'ux-shake')}
                  />
                  {errors.lastName ? (
                    <p className="ux-enter mt-1 text-xs font-medium text-red-600">
                      {errors.lastName}
                    </p>
                  ) : null}
                </div>
              </div>


              {/* Honeypot: invisible to people and screen readers. Bots that
                  auto-fill every input will fill this and get rejected. */}
              <div
                aria-hidden="true"
                style={{position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden'}}
              >
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={e => setHoneypot(e.target.value)}
                />
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-700">Email</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Your tracking number will be sent to this email.
                </p>
                <Input
                  required
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setErrors(current => ({...current, email: undefined}));
                    if (carrier === 'smart_tnt') {
                      setPhoneVerified(false);
                      setOtpCode('');
                      setCodeSentAt(null);
                      setOtpMessage(null);
                      setOtpError(null);
                    }
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={errors.email ? true : undefined}
                  className={cn('mt-2', errors.email && 'ux-shake')}
                />
                {errors.email ? (
                  <p className="ux-enter mt-1 text-xs font-medium text-red-600">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-700">
                  Mobile Number
                </p>
                <Input
                  required
                  value={mobileNumber}
                  onChange={e => {
                     setMobileNumber(sanitizePhone(e.target.value));
                    setErrors(current => ({
                      ...current,
                      mobileNumber: undefined
                    }));
                    if (carrier !== 'smart_tnt') {
                      setPhoneVerified(false);
                      setOtpCode('');
                      setCodeSentAt(null);
                      setOtpMessage(null);
                      setOtpError(null);
                    }
                  }}
                  placeholder="09xx xxx xxxx"
                  autoComplete="tel-national"
                  inputMode="tel"
                  aria-invalid={errors.mobileNumber ? true : undefined}
                  className={cn('mt-2', errors.mobileNumber && 'ux-shake')}
                />
                {errors.mobileNumber ? (
                  <p className="ux-enter mt-1 text-xs font-medium text-red-600">
                    {errors.mobileNumber}
                  </p>
                ) : null}

                <div className="mt-3 space-y-3">
                  {!phoneVerified ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={
                          isSendingOtp ||
                          cooldownLeft > 0 ||
                          carrier === null ||
                          (carrier === 'smart_tnt'
                            ? !email.trim()
                            : !mobileNumber.trim())
                        }
                        onClick={handleSendOtp}
                      >
                        {isSendingOtp ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : null}
                        {cooldownLeft > 0
                          ? `Resend in ${cooldownLeft}s`
                          : otpMessage
                            ? 'Resend code'
                            : 'Send code'}
                      </Button>

                      {codeSentAt ? (
                        <div data-enter-scope onKeyDown={enterNavigation}>
                          <div className="flex justify-center">
                            <InputOTP
                              maxLength={6}
                              value={otpCode}
                              onChange={(value: string) =>
                                setOtpCode(value.replace(/\D/g, '').slice(0, 6))
                              }
                              disabled={isVerifyingOtp}
                              autoComplete="one-time-code"
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                              </InputOTPGroup>
                              <InputOTPSeparator />
                              <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <Button
                            type="button"
                            className="mt-3 w-full rounded-full bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
                            data-enter-submit
                            disabled={otpCode.length !== 6 || isVerifyingOtp}
                            onClick={handleVerifyOtp}
                          >
                            {isVerifyingOtp ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : null}
                            Verify
                          </Button>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
                      <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                      {carrier === 'smart_tnt' ? 'Email verified' : 'Phone verified'}
                    </div>
                  )}

                  {otpMessage ? (
                    <p className="text-xs font-medium text-emerald-600">
                      {otpMessage}
                    </p>
                  ) : null}
                  {otpError ? (
                    <p className="text-xs font-medium text-red-600">
                      {otpError}
                    </p>
                  ) : null}
                </div>
              </div>

              <HeardFromPicker className="mt-5 border-t border-gray-100 pt-5" />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    Payment after confirmation
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    No payment is needed yet.
                  </p>
                </div>
                <CreditCard className="h-5 w-5 text-[#3c5e45]" />
              </div>

              <CheckoutPaymentNote orderType={orderType} total={total} />
              <CheckoutOrderNotices
                className="mt-4"
                orderType={orderType}
                timing={timing.timing}
                readyAt={selectedSlotAt}
                advanceOnly={scheduleQuote?.requirement.advanceOnly}
              />
            </div>
          </div>

          <div className="ux-enter lg:col-span-1 lg:sticky lg:top-[85px]">
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
                              className="ux-hit h-8 w-10 inline-flex items-center justify-center hover:bg-gray-50"
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
                            <div className="ux-num min-w-9 text-center text-base font-bold text-gray-900">
                              {item.qty}
                            </div>
                            <button
                              type="button"
                              className="ux-hit h-8 w-10 inline-flex items-center justify-center hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                              onClick={() =>
                                setQty(item.productId, item.qty + 1)
                              }
                              // Guests can't go over the order cap: one more
                              // of this item would cross it.
                              disabled={wouldExceedGuestMax(total, unitPrice)}
                              title={
                                wouldExceedGuestMax(total, unitPrice)
                                  ? `Guest orders are capped at ₱${GUEST_MAX_ORDER_TOTAL.toLocaleString('en-PH')}.`
                                  : undefined
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
                </div>

                <div className="h-px bg-gray-200" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="ux-num text-2xl font-extrabold text-gray-900">
                    ₱{total}.00
                  </span>
                </div>
                {orderType === 'Delivery' && deliveryMode === 'LALAMOVE' ? (
                  <p className="text-xs text-amber-700">
                    Courier fee not included, paid by you to your courier.
                  </p>
                ) : null}

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
            <p className="text-xl font-extrabold text-gray-900">₱{total}.00</p>
          </div>
          <div className="flex-1">{checkoutButton}</div>
        </div>
      </div>
    </div>
  );
}
