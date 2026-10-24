'use client';

import {useEffect, useState, useSyncExternalStore} from 'react';
import {useBrand} from '@/lib/hooks/useBrand';
import Image from 'next/image';
import {
  CheckCircle2,
  Clock,
  Loader2,
  Upload,
  X,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import FrameLoader from '@/shared/components/FrameLoader';
import {
  useCancelTrackedOrderMutation,
  useSubmitPaymentMutation,
  useTrackOrderQuery
} from '@/lib/hooks/orders/useTrackOrder';
import {useSettingsQuery} from '@/lib/hooks/useSettings';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  ONLINE_PAYMENT_LABELS,
  type OnlinePaymentMethod,
  type OrderHistoryEntry,
  type OrderHistoryItem
} from '@/lib/api/orderApi';
import {getGuestOrderHistory} from '@/lib/orders/orderHistoryStorage';
import {
  formatMinutes,
  OVERDUE_GRACE_MINUTES,
  useOrderPrepCountdown
} from '@/lib/hooks/useOrderPrepCountdown';

const STORE_NAME = "DonClaudio's Lechon House";
const STORE_ADDRESS =
  'Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza, Cavite, Philippines 4108';

const CANCELLABLE = ['pending'];

const CANCEL_REASONS = [
  'Ordered by mistake',
  'Taking too long',
  'Need to change my order',
  'Others'
];

type OrderType = 'pickup' | 'delivery' | 'reservation';

type Step = {status: string; label: string};

function getSteps(orderType: OrderType): Step[] {
  if (orderType === 'delivery') {
    return [
      {status: 'confirmed', label: 'Order Confirmed'},
      {status: 'preparing', label: 'Preparing your order'},
      {status: 'on_the_way', label: 'On the Way'},
      {status: 'completed', label: 'Order Completed'}
    ];
  }
  if (orderType === 'reservation') {
    return [
      {status: 'confirmed', label: 'Order Confirmed'},
      {status: 'preparing', label: 'Preparing your order'},
      {status: 'ready', label: 'Food Ready'},
      {status: 'completed', label: 'Order Completed'}
    ];
  }
  return [
    {status: 'confirmed', label: 'Order Confirmed'},
    {status: 'preparing', label: 'Preparing your order'},
    {status: 'ready', label: 'Ready for Pick-up'},
    {status: 'completed', label: 'Order Completed'}
  ];
}

function getItemName(item: OrderHistoryItem) {
  if (item.name) return item.name;
  if (item.productId && typeof item.productId === 'object') {
    return item.productId.name ?? 'Product';
  }
  return 'Product';
}

function getItemImage(item: OrderHistoryItem) {
  if (item.imageUrl) return item.imageUrl;
  if (item.productId && typeof item.productId === 'object') {
    return item.productId.imageUrl;
  }
  return undefined;
}

function fmtMoney(value: number) {
  return `₱${(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function orderTypeDisplay(orderType: string) {
  if (orderType === 'pickup') return 'Pick-up';
  if (orderType === 'delivery') return 'Delivery';
  return 'Reservation';
}

function itemIsPreOrder(item: OrderHistoryItem) {
  return item.productId && typeof item.productId === 'object'
    ? item.productId.isPreOrder === true
    : false;
}

/** Down payments only apply to carts made up entirely of pre-order products. */
function orderIsPreOrderOnly(order: OrderHistoryEntry) {
  return (
    order.items.length > 0 && order.items.every(item => itemIsPreOrder(item))
  );
}

function paymentDisplay(order: OrderHistoryEntry) {
  const method = order.paymentMethod;
  // Manual payment flow: the channel is agreed with the cashier on the
  // confirmation call, so nothing is recorded until the customer submits.
  if (!method || method === 'other') {
    return 'To be arranged with the cashier';
  }
  let label: string;
  switch (method) {
    case 'gcash':
      label = 'GCash';
      break;
    case 'maya':
      label = 'Maya';
      break;
    case 'bdo':
      label = 'BDO Transfer';
      break;
    case 'bpi':
      label = 'BPI Transfer';
      break;
    case 'psbank':
      label = 'PSBank Transfer';
      break;
    case 'card':
      label = 'Card';
      break;
    default:
      // Cash only ever means the counter POS (paid at the register).
      label = order.orderType === 'delivery' ? 'Cash' : 'Cash';
  }
  if (order.changeFor) {
    label += ` (Change for ₱${order.changeFor})`;
  }
  return label;
}

function deliveryAddress(order: OrderHistoryEntry) {
  if (order.orderType === 'delivery') {
    return order.guestInfo?.address?.length
      ? order.guestInfo.address
      : order.customerName
        ? `${order.customerName}'s saved address`
        : STORE_ADDRESS;
  }
  return STORE_ADDRESS;
}

export default function OrderTracking({
  orderId,
  variant,
  embedded = false
}: {
  orderId: string;
  variant: 'guest' | 'customer';
  embedded?: boolean;
}) {
  const brand = useBrand();
  const [phone, setPhone] = useState('');
  const [phoneSubmitted, setPhoneSubmitted] = useState(false);

  const storedPhone = useSyncExternalStore(
    () => () => {},
    () =>
      getGuestOrderHistory().find(o => o._id === orderId)?.guestInfo
        ?.phoneNumber ?? '',
    () => ''
  );

  const autoPhone = variant === 'guest' ? storedPhone : '';
  const needsPhoneGate =
    variant === 'guest' && !autoPhone && !phoneSubmitted;
  const resolvedPhone =
    variant === 'guest'
      ? phoneSubmitted
        ? phone
        : autoPhone
      : undefined;

  const query = useTrackOrderQuery(orderId, resolvedPhone);
  const order = query.data?.order;

  if (needsPhoneGate) {
    return (
      <PhoneGate
        initialValue={phone}
        onChangeValue={setPhone}
        onSubmit={() => setPhoneSubmitted(true)}
        embedded={embedded}
      />
    );
  }

  return (
    <div className={embedded ? '' : 'min-h-screen'}>
      <div
        className={
          embedded
            ? 'w-full max-w-3xl mx-auto space-y-4'
            : 'w-full max-w-3xl mx-auto px-4 py-10 space-y-6'
        }
      >
        {query.isLoading && !order ? (
          <div className="py-10 grid place-items-center">
            <FrameLoader
              framesDir="/assets/order-loading"
              frames={[
                'frame_01.png',
                'frame_02.png',
                'frame_03.png',
                'frame_04.png',
                'frame_05.png'
              ]}
              size={160}
            />
          </div>
        ) : query.isError || !order ? (
          <div className="rounded-2xl bg-white shadow p-10 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto text-gray-400" />
            <p className="mt-4 text-base font-bold text-gray-900">
              Order not found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {variant === 'customer'
                ? 'We could not load this order. Make sure you are signed in with the account that placed it.'
                : 'We couldn\u2019t find this order. Please check the link or the phone number you entered.'}
            </p>
            {variant === 'customer' ? (
              <a
                href="/sign-in"
                className="mt-4 inline-block rounded-full bg-[#3c5e45] px-5 py-2 text-sm font-semibold text-white"
              >
                Sign in
              </a>
            ) : null}
          </div>
        ) : (
          <>
            {order.orderStatus === 'cancelled' ? (
              <CancelledCard order={order} />
            ) : (
              <StatusTrackerCard order={order} />
            )}
            <OrderSummaryCard order={order} />
            <ManualPaymentCard
              order={order}
              phone={resolvedPhone}
              variant={variant}
            />
            <PaymentsDetailsCard order={order} />
            {CANCELLABLE.includes(order.orderStatus) && (
              <CancelOrderButton orderId={orderId} phone={resolvedPhone} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PhoneGate({
  initialValue,
  onChangeValue,
  onSubmit,
  embedded = false
}: {
  initialValue: string;
  onChangeValue: (value: string) => void;
  onSubmit: () => void;
  embedded?: boolean;
}) {
  const brand = useBrand();
  return (
    <div className={embedded ? 'bg-gray-50' : 'min-h-screen bg-gray-50'}>
      <div className="w-full max-w-md mx-auto px-4 py-12">
        <div className="rounded-2xl bg-white shadow p-8 text-center">
          <div className="relative w-20 h-20 mx-auto rounded-full bg-[#3c5e45]/10 overflow-hidden">
            <Image
              src={brand.logo}
              alt="DonClaudio's"
              fill
              className="object-contain p-3"
            />
          </div>
          <h2 className="mt-5 text-lg font-bold text-gray-900">
            Track your order
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Enter the phone number you used when placing this order to see its
            status.
          </p>
          <input
            type="tel"
            inputMode="tel"
            value={initialValue}
            onChange={e => onChangeValue(e.target.value)}
            placeholder="Mobile number"
            className="mt-5 w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#3c5e45] focus:ring-2 focus:ring-[#3c5e45]/20"
          />
          <Button
            type="button"
            className="mt-4 w-full h-12 rounded-full bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
            disabled={!initialValue.trim()}
            onClick={onSubmit}
          >
            Track Order
          </Button>
        </div>
      </div>
    </div>
  );
}

function CustomerEtaPanel({order}: {order: OrderHistoryEntry}) {
  const {estimate, remaining, isRunning, isOverdue, hasEstimate} =
    useOrderPrepCountdown(order.prepTiming);

  if (!hasEstimate || order.orderType === 'reservation') return null;

  if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed') {
    return (
      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-semibold text-gray-700">
          This order took about {formatMinutes(estimate as number)} to prepare.
        </p>
      </div>
    );
  }

  if (isOverdue) {
    return (
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-bold text-amber-800">
          Your order is taking longer than usual
        </p>
        <p className="mt-1 text-sm text-amber-700">
          We expected it in about {formatMinutes((estimate as number) + OVERDUE_GRACE_MINUTES)}{' '}
          and the kitchen is still working on it. Sorry for the wait — you can
          follow the live status below, and our team is aware.
        </p>
      </div>
    );
  }

  if (isRunning && remaining !== null) {
    return (
      <div className="mt-5 rounded-xl border border-[#3c5e45]/20 bg-[#3c5e45]/5 px-4 py-3">
        <p className="text-sm font-bold text-[#2d4a35]">
          Ready in about {formatMinutes(remaining)}
        </p>
        <p className="mt-1 text-sm text-[#2d4a35]/80">
          Started preparing at{' '}
          {order.prepTiming?.preparingAt
            ? new Date(order.prepTiming.preparingAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'a moment ago'}
          . We&apos;ll let you know when it&apos;s on the way.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-sm font-semibold text-gray-900">
        Estimated prep time: {formatMinutes(estimate as number)}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        The countdown starts once the kitchen begins preparing your order.
      </p>
    </div>
  );
}

function StatusTrackerCard({order}: {order: OrderHistoryEntry}) {
  const brand = useBrand();
  const steps = getSteps(order.orderType as OrderType);
  const statusIndex = steps.findIndex(s => s.status === order.orderStatus);
  const currentIndex = order.orderStatus === 'pending' ? -1 : statusIndex;

  return (
    <div className="rounded-2xl bg-white shadow p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-full bg-[#3c5e45]/10 overflow-hidden shrink-0">
          <Image
            src={brand.logo}
            alt="DonClaudio's"
            fill
            className="object-contain p-1.5"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Order status</p>
          <p className="text-xs text-gray-500">
            {STORE_NAME} • {orderTypeDisplay(order.orderType)}
          </p>
        </div>
      </div>

      {order.orderStatus === 'pending' && (
        <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            Waiting for the store to confirm your order
          </p>
        </div>
      )}

      <CustomerEtaPanel order={order} />

      <div className="mt-6 flex flex-col">
        {steps.map((step, i) => {
          const isPast = currentIndex >= 0 && i < currentIndex;
          const isCurrent = i === currentIndex;
          const isLast = i === steps.length - 1;
          return (
            <div key={step.status} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={
                    isCurrent
                      ? 'mt-1 h-5 w-5 rounded-full bg-[#3c5e45] ring-4 ring-[#3c5e45]/20'
                      : isPast
                        ? 'mt-1.5 h-4 w-4 rounded-full bg-gray-400'
                        : 'mt-1.5 h-4 w-4 rounded-full border-2 border-gray-300 bg-white'
                  }
                />
                {!isLast && (
                  <div
                    className={
                      isPast || isCurrent
                        ? 'w-0.5 flex-1 min-h-8 bg-[#3c5e45]'
                        : 'w-0.5 flex-1 min-h-8 bg-gray-200'
                    }
                  />
                )}
              </div>
              <div className="pb-8 last:pb-0">
                <p
                  className={
                    isCurrent
                      ? 'text-sm font-bold text-gray-900'
                      : isPast
                        ? 'text-sm text-gray-500'
                        : 'text-sm text-gray-400'
                  }
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-5 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
        <Clock className="h-4 w-4 text-gray-400" />
        <span className="font-semibold text-gray-900">Estimated time </span>
        <span>
          Check back on this page for the latest update on your order.
        </span>
      </div>
    </div>
  );
}

function CancelledCard({order}: {order: OrderHistoryEntry}) {
  return (
    <div className="rounded-2xl bg-red-50 border border-red-200 shadow p-8 text-center">
      <div className="h-14 w-14 mx-auto rounded-full bg-red-100 flex items-center justify-center">
        <XCircle className="h-7 w-7 text-red-600" />
      </div>
      <p className="mt-4 text-lg font-bold text-gray-900">
        This order was cancelled
      </p>
      <p className="mt-1 text-sm text-gray-600">
        No further updates will be made to this order.
      </p>
      {order.cancelReason?.length ? (
        <p className="mt-4 inline-block rounded-full bg-white border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600">
          Reason: {order.cancelReason}
        </p>
      ) : null}
    </div>
  );
}

function OrderSummaryCard({order}: {order: OrderHistoryEntry}) {
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryFee = order.deliveryFee ?? 0;

  return (
    <div className="rounded-2xl bg-white shadow p-6">
      <p className="text-base font-bold text-gray-900">Order Summary</p>

      <div className="mt-5 space-y-4">
        {order.items.length === 0 ? (
          <p className="text-sm text-gray-500">No items on this order.</p>
        ) : (
          order.items.map((item, index) => {
            const itemImageUrl = getItemImage(item);
            return (
              <div
                key={item._id ?? `${order._id}-${index}`}
                className="flex items-start gap-3"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                  <Image
                    src={
                      itemImageUrl && itemImageUrl.length > 0
                        ? itemImageUrl
                        : '/assets/sample_menu.png'
                    }
                    alt={getItemName(item)}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 line-clamp-2">
                    {getItemName(item)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Qty {item.quantity} • {fmtMoney(item.price)} each
                  </p>
                  {item.specialRequest ? (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Request: {item.specialRequest}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-sm font-extrabold text-gray-900">
                  {fmtMoney(item.price * item.quantity)}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 rounded-xl bg-gray-50 p-4">
        <div className="flex items-center justify-between text-sm text-gray-700">
          <span>Subtotal</span>
          <span className="font-semibold">{fmtMoney(subtotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-gray-700">
          <span>Delivery fee</span>
          <span className="font-semibold">
            {deliveryFee > 0 ? fmtMoney(deliveryFee) : 'Free'}
          </span>
        </div>
        <div className="mt-2 h-px bg-gray-200" />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">Total</span>
          <span className="text-xl font-extrabold text-gray-900">
            {fmtMoney(order.totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}

const PAYMENT_METHOD_OPTIONS = Object.entries(ONLINE_PAYMENT_LABELS) as Array<
  [OnlinePaymentMethod, string]
>;

/**
 * MANUAL PAYMENT card.
 *
 * Appears once the cashier confirms the order (never while it is pending).
 * Shows
 * the payment instructions configured by the admin, then a submission form:
 * the customer declares a down payment (pre-order-only carts) or full
 * payment, picks the channel (GCash/Maya/BDO/BPI/PSBank), and uploads the
 * screenshot. The cashier verifies it afterwards; a verified payment is
 * locked and a rejected one drops back to the form.
 */
function ManualPaymentCard({
  order,
  phone,
  variant
}: {
  order: OrderHistoryEntry;
  phone?: string;
  variant: 'guest' | 'customer';
}) {
  const paymentOpen = [
    'confirmed',
    'preparing',
    'ready',
    'on_the_way'
  ].includes(order.orderStatus);
  if (!paymentOpen) return null;

  return <ManualPaymentCardBody order={order} phone={phone} variant={variant} />;
}

function ManualPaymentCardBody({
  order,
  phone,
  variant
}: {
  order: OrderHistoryEntry;
  phone?: string;
  variant: 'guest' | 'customer';
}) {
  const settingsQuery = useSettingsQuery();
  const paymentSettings = settingsQuery.data?.payment;
  const channels = (paymentSettings?.channels || []).filter(ch => ch && ch.id && ch.enabled !== false);
  const [selectedChannelId, setSelectedChannelId] = useState(
    paymentSettings?.activeChannelId || channels[0]?.id || ''
  );
  const selectedChannel =
    channels.find(ch => ch.id === selectedChannelId) ||
    channels[0] ||
    (paymentSettings
      ? {
          id: 'legacy',
          name: 'Payment',
          image: paymentSettings.image || '',
          accountName: paymentSettings.accountName || '',
          accountNumber: paymentSettings.accountNumber || '',
          instructions: paymentSettings.instructions || '',
          enabled: true
        }
      : null);
  useEffect(() => {
    if (channels.length > 0 && !channels.some(ch => ch.id === selectedChannelId)) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  const submitMutation = useSubmitPaymentMutation(order._id, phone);

  const [formOpen, setFormOpen] = useState(
    order.paymentStatus !== 'down_payment' && order.paymentStatus !== 'paid'
  );
  const [claim, setClaim] = useState<'down_payment' | 'paid'>('paid');
  const [method, setMethod] = useState<OnlinePaymentMethod>('gcash');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verified = order.paymentVerified === true;
  const alreadyClaimed =
    order.paymentStatus === 'down_payment' || order.paymentStatus === 'paid';
  const downPaymentAllowed = orderIsPreOrderOnly(order) && !verified;

  const handleSubmit = async () => {
    if (!proof) {
      setError('Please attach a screenshot of your payment.');
      return;
    }
    setError(null);
    try {
      await submitMutation.mutateAsync({
        status: claim,
        paymentMethod: method,
        note,
        proof,
        phoneNumber: variant === 'guest' ? phone : undefined
      });
      setProof(null);
      setNote('');
      setFormOpen(false);
    } catch (e) {
      setError(
        getFriendlyErrorMessage(e, 'Could not submit your payment. Please try again.')
      );
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow p-6">
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-gray-900">Payment</p>
        {verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Payment verified
          </span>
        ) : null}
      </div>

      {verified ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-gray-600">
            Your payment has been verified. Thank you!
          </p>
          {order.paymentProofUrl ? (
            <a
              href={order.paymentProofUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-semibold text-[#3c5e45] hover:underline"
            >
              View my submitted proof of payment
            </a>
          ) : null}
        </div>
      ) : alreadyClaimed && !formOpen ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-amber-800">
              Submitted — awaiting verification
            </p>
            <p className="mt-1 text-sm text-amber-700">
              You submitted a{' '}
              {order.paymentStatus === 'down_payment' ? 'down payment' : 'full payment'}{' '}
              through {paymentDisplay(order)}. Our cashier will verify it shortly.
            </p>
          </div>
          {order.paymentProofUrl ? (
            <a
              href={order.paymentProofUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-semibold text-[#3c5e45] hover:underline"
            >
              View submitted screenshot
            </a>
          ) : null}
          <button
            type="button"
            className="text-xs font-semibold text-[#3c5e45] hover:underline"
            onClick={() => setFormOpen(true)}
          >
            Something wrong? Re-submit your payment
          </button>
        </div>
      ) : (
        <>
          {alreadyClaimed ? (
            <p className="mt-2 text-xs text-gray-500">
              You already have a submitted payment. Submitting again replaces it
              (until it is verified).
            </p>
          ) : null}

          {channels.length > 1 ? (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Payment method
              </p>
              <select
                value={selectedChannelId}
                onChange={e => setSelectedChannelId(e.target.value)}
                className="mt-2 w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#3c5e45] focus:ring-2 focus:ring-[#3c5e45]/20"
              >
                {channels.map(ch => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name || 'Payment method'}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {selectedChannel?.image ? (
            <div className="mt-4 flex justify-center overflow-hidden rounded-xl border border-gray-200">
              <Image
                src={selectedChannel.image}
                alt={selectedChannel.name || 'Payment account details'}
                width={320}
                height={320}
                className="h-48 w-auto max-w-full object-contain"
                unoptimized
              />
            </div>
          ) : null}

          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
            {selectedChannel?.accountName ? (
              <p className="font-semibold">{selectedChannel.accountName}</p>
            ) : null}
            {selectedChannel?.accountNumber ? (
              <p className="mt-1 font-mono text-base font-bold text-gray-900">
                {selectedChannel.accountNumber}
              </p>
            ) : null}
            {selectedChannel?.instructions ? (
              <p className="mt-2 whitespace-pre-line">{selectedChannel.instructions}</p>
            ) : null}
            {!selectedChannel?.image &&
            !selectedChannel?.accountName &&
            !selectedChannel?.accountNumber &&
            !selectedChannel?.instructions ? (
              <p className="italic">
                Send your payment to the store account, then upload the
                screenshot below. If you need the details, please contact us.
              </p>
            ) : null}
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              What did you pay?
            </p>
            {downPaymentAllowed ? (
              <button
                type="button"
                onClick={() => setClaim('down_payment')}
                aria-pressed={claim === 'down_payment'}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  claim === 'down_payment'
                    ? 'border-[#3c5e45]/40 bg-[#3c5e45]/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    claim === 'down_payment'
                      ? 'border-[#3c5e45] bg-[#3c5e45]'
                      : 'border-gray-300'
                  }`}
                >
                  {claim === 'down_payment' ? (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  I paid the down payment
                </span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setClaim('paid')}
              aria-pressed={claim === 'paid'}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                claim === 'paid'
                  ? 'border-[#3c5e45]/40 bg-[#3c5e45]/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  claim === 'paid'
                    ? 'border-[#3c5e45] bg-[#3c5e45]'
                    : 'border-gray-300'
                }`}
              >
                {claim === 'paid' ? (
                  <span className="h-2 w-2 rounded-full bg-white" />
                ) : null}
              </span>
              <span className="text-sm font-bold text-gray-900">
                I paid in full
              </span>
            </button>
          </div>

          <div className="mt-4 hidden">
            <select
              value={method}
              onChange={e => setMethod(e.target.value as OnlinePaymentMethod)}
              className="hidden"
            >
              {PAYMENT_METHOD_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Proof of payment
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={e => setProof(e.target.files?.[0] ?? null)}
              className="mt-2 w-full text-sm text-gray-700 file:mr-3 file:rounded-full file:border-0 file:bg-[#3c5e45] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
            />
            <p className="mt-1 text-xs text-gray-500">
              Upload a screenshot or receipt image (max 5&nbsp;MB).
            </p>
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Note (optional)
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. paid ₱1,500 down payment as agreed over the phone"
              rows={2}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#3c5e45] focus:ring-2 focus:ring-[#3c5e45]/20"
            />
          </div>

          {error ? (
            <p className="mt-3 text-xs font-medium text-red-600">{error}</p>
          ) : null}

          <Button
            type="button"
            className="mt-4 w-full h-11 rounded-full bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
            disabled={submitMutation.isPending}
            onClick={handleSubmit}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {alreadyClaimed ? 'Replace payment submission' : 'Submit my payment'}
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}

function PaymentsDetailsCard({order}: {order: OrderHistoryEntry}) {
  const rows: {label: string; value: string}[] = [
    {label: 'Payment method', value: paymentDisplay(order)},
    {label: 'Order Number', value: order._id},
    {label: 'Order type', value: orderTypeDisplay(order.orderType)},
    {
      label: order.orderType === 'delivery' ? 'Delivery address' : 'Branch location',
      value: deliveryAddress(order)
    }
  ];

  if (order.createdAt) {
    rows.push({
      label: 'Placed at',
      value: new Date(order.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    });
  }
  if (order.customerName) {
    rows.push({label: 'Customer', value: order.customerName});
  }

  return (
    <div className="rounded-2xl bg-white shadow p-6">
      <p className="text-base font-bold text-gray-900">Payment & Order Details</p>

      <div className="mt-5 space-y-4">
        {rows.map(row => (
          <div key={row.label} className="flex items-start justify-between gap-6">
            <p className="text-xs text-gray-500 shrink-0 pt-0.5">
              {row.label}
            </p>
            <p className="text-right text-sm font-semibold text-gray-900 break-words min-w-0">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CancelOrderButton({
  orderId,
  phone
}: {
  orderId: string;
  phone?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [otherText, setOtherText] = useState('');
  const cancelMutation = useCancelTrackedOrderMutation(orderId, phone);
  const isPending = cancelMutation.isPending;
  const error = cancelMutation.error as {
    message?: string;
  } | null;

  const finalReason =
    reason === 'Others'
      ? otherText.trim().length
        ? otherText.trim()
        : 'Others'
      : reason;

  return (
    <div className="pt-2 pb-8">
      <Button
        type="button"
        variant="destructive"
        className="w-full h-12 rounded-full font-bold text-white"
        onClick={() => setOpen(true)}
      >
        Cancel Order
      </Button>
      <p className="mt-2 text-center text-xs text-gray-400">
        You can only cancel while your order is still pending.
      </p>

      {open ? (
        <div className="fixed inset-0 z-100" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => {
              if (!isPending) setOpen(false);
            }}
          />
          <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white shadow-xl border border-gray-100 rounded-t-2xl sm:rounded-2xl p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    Let us know why you&apos;re cancelling
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    This will permanently cancel your order.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
                  onClick={() => {
                    if (!isPending) setOpen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {CANCEL_REASONS.map(option => (
                  <label
                    key={option}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 cursor-pointer has-[:checked]:border-[#3c5e45] has-[:checked]:bg-[#3c5e45]/5"
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={option}
                      checked={reason === option}
                      onChange={() => setReason(option)}
                      className="accent-[#3c5e45] h-4 w-4"
                    />
                    <span className="text-sm text-gray-800">{option}</span>
                  </label>
                ))}
              </div>

              {reason === 'Others' ? (
                <input
                  type="text"
                  value={otherText}
                  onChange={e => setOtherText(e.target.value)}
                  placeholder="Tell us more (optional)"
                  className="mt-3 w-full h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#3c5e45]"
                />
              ) : null}

              {error?.message ? (
                <p className="mt-3 text-xs text-red-600">{error.message}</p>
              ) : null}

              <div className="mt-6 space-y-2.5">
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full h-12 rounded-full font-bold text-white"
                  disabled={isPending}
                  onClick={() => cancelMutation.mutate(finalReason)}
                >
                  {isPending ? 'Cancelling...' : 'Cancel Order'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-full border-[#3c5e45] text-[#3c5e45]"
                  disabled={isPending}
                  onClick={() => setOpen(false)}
                >
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}