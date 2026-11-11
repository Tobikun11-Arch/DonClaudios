'use client';

import {useMemo} from 'react';
import {useFreeDeliveryQuery} from '@/lib/hooks/useFreeDelivery';
import {
  getDeliveryMode,
  isLechonCategory,
  isPointInZone,
  isValidLatLng,
  type DeliveryCartItem,
  type DeliveryMode,
  type FreeDeliverySettings,
  type LatLng
} from './deliveryMode';

export type FreeDeliveryStatus = {
  mode: DeliveryMode;
  settings: FreeDeliverySettings;
  /** Why the order is (or is not) free, for the UI message. */
  reason:
    | 'free'
    | 'guest'
    | 'disabled'
    | 'no_pin'
    | 'outside_zone'
    | 'below_minimum';
  /** Pesos still needed to reach the minimum (0 when not applicable). */
  remaining: number;
  pinInside: boolean | null;
};

/**
 * Same decision the server makes when the order is placed, plus the reason,
 * so checkout can tell the customer what to change to get free delivery.
 */
export function useFreeDeliveryStatus(
  items: DeliveryCartItem[],
  buyer: 'guest' | 'customer',
  location: Partial<LatLng> | {lat: number | null; lng: number | null} | null | undefined
): FreeDeliveryStatus {
  const {settings} = useFreeDeliveryQuery();

  return useMemo(() => {
    const pin =
      location && isValidLatLng({lat: location.lat, lng: location.lng})
        ? {lat: location.lat as number, lng: location.lng as number}
        : null;
    const pinInside = pin ? isPointInZone(pin, settings.zone) : null;
    const mode = getDeliveryMode(items, {buyer, location: pin, settings});

    const subtotal = items.reduce(
      (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
      0
    );
    const hasLechon = items.some(i => isLechonCategory(i.category));
    const remaining =
      hasLechon ? 0 : Math.max(0, Math.ceil(settings.minSubtotal - subtotal));

    let reason: FreeDeliveryStatus['reason'];
    if (mode === 'DONCLAUDIO') reason = 'free';
    else if (buyer !== 'customer') reason = 'guest';
    else if (!settings.enabled) reason = 'disabled';
    else if (!pin) reason = 'no_pin';
    else if (!pinInside) reason = 'outside_zone';
    else reason = 'below_minimum';

    return {mode, settings, reason, remaining, pinInside};
  }, [items, buyer, location, settings]);
}
