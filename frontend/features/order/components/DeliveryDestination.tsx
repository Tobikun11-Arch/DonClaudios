'use client';

import {MapPin, Bike} from 'lucide-react';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';
import {courierLabel, fulfillmentKind} from '@/lib/orders/orderFlow';

type DestinationOrder = Pick<
  OrderHistoryEntry,
  'orderType' | 'deliveryMode' | 'courier' | 'deliveryLocation' | 'riderNotes' | 'guestInfo' | 'isPreOrder'
>;

/** True when the order goes to the customer's address (not picked up at the store). */
export function hasDeliveryDestination(order: DestinationOrder) {
  return order.orderType === 'delivery' && !order.isPreOrder;
}

function mapsUrl(order: DestinationOrder) {
  const loc = order.deliveryLocation;
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  }
  const address = order.guestInfo?.address?.trim();
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
}

/**
 * "Where is the food going": the address the order was placed with (saved on
 * the order, so later profile edits don't change it), the pinned map location,
 * rider notes and who delivers it. Shared by the customer, cashier and owner
 * order details. Renders nothing for pick-up / reservation orders.
 */
export function DeliveryDestination({
  order,
  showNotes = true,
  className = ''
}: {
  order: DestinationOrder;
  showNotes?: boolean;
  className?: string;
}) {
  if (!hasDeliveryDestination(order)) return null;

  const address = order.guestInfo?.address?.trim();
  const url = mapsUrl(order);
  const kind = fulfillmentKind(order);
  const deliveredBy =
    kind === 'store_delivery'
      ? "DonClaudio's rider"
      : `${courierLabel(order.courier)} (booked by customer)`;

  return (
    <div
      className={`rounded-xl border border-gray-100 p-3 dark:border-gray-800 ${className}`}
      data-testid="delivery-destination"
    >
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#2d4a35] dark:text-[#7ed4a0]">
        <MapPin size={14} className="shrink-0" />
        Delivery to
      </p>
      <p className="mt-1.5 text-sm font-medium leading-relaxed text-gray-800 break-words dark:text-gray-100">
        {address || 'No address given — call the customer'}
      </p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-[0.82rem] font-semibold text-[#2d4a35] underline-offset-2 hover:underline dark:text-[#7ed4a0]"
        >
          {order.deliveryLocation ? 'Open pinned location in Maps' : 'Open in Maps'}
        </a>
      ) : null}
      {showNotes && order.riderNotes ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[0.8rem] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Rider notes: {order.riderNotes}
        </p>
      ) : null}
      <p className="mt-2 flex items-center gap-1.5 text-[0.8rem] text-gray-500 dark:text-gray-400">
        <Bike size={14} className="shrink-0" />
        Delivered by {deliveredBy}
      </p>
    </div>
  );
}
