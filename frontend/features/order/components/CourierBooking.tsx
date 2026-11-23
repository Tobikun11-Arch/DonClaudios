'use client';

import {useState} from 'react';
import {Bike, Check} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {CourierBookingInput, OrderHistoryEntry} from '@/lib/api/orderApi';
import {courierLabel, fulfillmentKind} from '@/lib/orders/orderFlow';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  useAcknowledgeCourierMutation,
  useBookCourierMutation
} from '@/lib/hooks/orders/useOrderMessage';

const BOOKABLE = ['confirmed', 'preparing', 'ready'];

/** The customer books their own rider, and the order is at a stage where that makes sense. */
export function canBookCourier(order: OrderHistoryEntry) {
  return fulfillmentKind(order) === 'courier_delivery' && BOOKABLE.includes(order.orderStatus);
}

export function courierBookingSummary(order: OrderHistoryEntry) {
  const b = order.courierBooking;
  if (!b) return '';
  return [courierLabel(order.courier), b.riderName, b.plateNumber, b.eta ? `ETA ${b.eta}` : null]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Customer side, inside "Message the store": the "I've booked my courier"
 * button, a short optional form (rider, plate, tracking link, ETA), and once
 * sent, a line showing what the store knows.
 */
export function CourierBookingAction({
  order,
  asGuest
}: {
  order: OrderHistoryEntry;
  asGuest: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CourierBookingInput>({
    riderName: order.courierBooking?.riderName ?? '',
    plateNumber: order.courierBooking?.plateNumber ?? '',
    trackingLink: order.courierBooking?.trackingLink ?? '',
    eta: order.courierBooking?.eta ?? ''
  });
  const mutation = useBookCourierMutation();

  if (!canBookCourier(order)) return null;
  const booked = order.courierBooking;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutation.mutateAsync({orderId: order._id, input: form, asGuest});
      setOpen(false);
      toast.success('The store knows your rider is coming.');
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Could not send your courier details.'));
    }
  };

  const field = (key: keyof CourierBookingInput, label: string, placeholder: string, type = 'text') => (
    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
      {label} <span className="font-normal text-gray-400">(optional)</span>
      <Input
        type={type}
        value={form[key] ?? ''}
        placeholder={placeholder}
        onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
        className="mt-1"
      />
    </label>
  );

  return (
    <div className="mb-3">
      {booked && !open ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#3c5e45]/20 bg-[#e9f5ee] px-3 py-2 text-xs text-[#2d4a35] dark:border-[#7ed4a0]/20 dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]">
          <Bike className="h-4 w-4 shrink-0" />
          <span className="font-semibold">Courier booked:</span>
          <span className="min-w-0 flex-1">{courierBookingSummary(order)}</span>
          {booked.acknowledgedAt ? (
            <span className="inline-flex items-center gap-1 font-semibold">
              <Check className="h-3.5 w-3.5" /> Store got it
            </span>
          ) : null}
          <button type="button" className="font-semibold underline" onClick={() => setOpen(true)}>
            Update
          </button>
        </div>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#2d4a35] bg-[#2d4a35] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#3a5c44]"
        >
          <Bike className="h-3.5 w-3.5" />
          I&apos;ve booked my courier
        </button>
      ) : null}

      {open ? (
        <form
          onSubmit={submit}
          className="mt-2 space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700"
          aria-label="Courier details"
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Tell the store your {courierLabel(order.courier)} rider is coming
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('riderName', 'Rider name', 'e.g. Juan D.')}
            {field('plateNumber', 'Plate no.', 'e.g. ABC 1234')}
            {field('eta', 'ETA', 'e.g. 12:40 PM')}
            {field('trackingLink', 'Tracking link', 'https://…', 'url')}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={mutation.isPending}
              className="bg-[#2d4a35] text-white hover:bg-[#3a5c44]"
            >
              {mutation.isPending ? 'Sending…' : booked ? 'Update details' : 'Send to store'}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

/** Small badge for order lists: "Courier booked · ETA 12:40". */
export function CourierBookedBadge({order}: {order: OrderHistoryEntry}) {
  const b = order.courierBooking;
  if (!b || fulfillmentKind(order) !== 'courier_delivery') return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
      <Bike className="h-3 w-3" />
      Courier booked{b.eta ? ` · ETA ${b.eta}` : ''}
    </span>
  );
}

/**
 * Staff side (cashier / owner): the rider details and the quick reply
 * "Got it, we'll have it ready", which is posted in the order chat.
 */
export function CourierBookingStaffPanel({order}: {order: OrderHistoryEntry}) {
  const mutation = useAcknowledgeCourierMutation();
  const b = order.courierBooking;
  if (fulfillmentKind(order) !== 'courier_delivery') return null;

  if (!b) {
    return BOOKABLE.includes(order.orderStatus) ? (
      <p className="mb-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        The customer books their own {courierLabel(order.courier)} rider. You&apos;ll be notified here when they do.
      </p>
    ) : null;
  }

  const ack = async () => {
    try {
      await mutation.mutateAsync({orderId: order._id});
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Could not send the reply.'));
    }
  };

  return (
    <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-500/30 dark:bg-sky-500/10">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
        <Bike className="h-4 w-4" /> Courier booked
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{courierBookingSummary(order)}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Booked {new Date(b.bookedAt).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}
      </p>
      {b.trackingLink ? (
        <a
          href={b.trackingLink}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs font-semibold text-sky-700 underline dark:text-sky-300"
        >
          Track rider
        </a>
      ) : null}
      <div className="mt-2">
        {b.acknowledgedAt ? (
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            Replied{b.acknowledgedBy?.name ? ` by ${b.acknowledgedBy.name}` : ''}
          </p>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={ack}
            disabled={mutation.isPending}
            className="bg-[#2d4a35] text-white hover:bg-[#3a5c44]"
          >
            {mutation.isPending ? 'Sending…' : "Got it, we'll have it ready"}
          </Button>
        )}
      </div>
    </div>
  );
}
