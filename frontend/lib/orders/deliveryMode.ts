/**
 * Delivery rules for the UI.
 *
 * Authoritative rules live in `backend/api/config/delivery.ts` (the server
 * decides the real delivery mode when the order is placed). Keep in sync.
 *
 * Free delivery by DonClaudio's own rider ("DONCLAUDIO") needs ALL of:
 *   1. a customer with an account (guests always book Lalamove),
 *   2. free delivery switched on by the owner,
 *   3. a pinned drop-off inside the free-delivery zone (Tanza area), and
 *   4. a lechon item OR a subtotal at or above the owner's minimum.
 * Anything else is delivered by Lalamove, booked and paid by the customer.
 */

export const LECHON_CATEGORIES = [
  'Cochinillo',
  'Lechon Belly',
  'Lechon de Leche',
  'Traditional Lechon'
] as const;

export type LechonCategory = (typeof LECHON_CATEGORIES)[number];

export const STORE_ADDRESS =
  'Jasmine St. De Roman Brgy. Daang Amaya 1, Tanza, Cavite, Philippines 4108';

export const STORE_LOCATION: LatLng = {lat: 14.39092185435405, lng: 120.8530823121149};

export type DeliveryMode = 'DONCLAUDIO' | 'LALAMOVE';

export type LatLng = {lat: number; lng: number};

export type FreeDeliverySettings = {
  enabled: boolean;
  /** Subtotal (after promos) that unlocks free delivery, in pesos. */
  minSubtotal: number;
  /** Polygon (at least 3 points) a pinned drop-off must fall inside. */
  zone: LatLng[];
};

/**
 * Default zone: Tanza town proper and the barangays south of it, kept about
 * 500 m inside the Rosario and General Trias borders (the store is only
 * ~1.2 km from both) and ending ~6 km south of the store, short of Naic and
 * Trece Martires. The west edge follows the Manila Bay shore loosely. The
 * owner can redraw it in Settings → Delivery.
 */
export const DEFAULT_FREE_DELIVERY_ZONE: LatLng[] = [
  {lat: 14.4085, lng: 120.84},
  {lat: 14.4, lng: 120.853},
  {lat: 14.388, lng: 120.86},
  {lat: 14.38, lng: 120.868},
  {lat: 14.365, lng: 120.869},
  {lat: 14.348, lng: 120.864},
  {lat: 14.338, lng: 120.86},
  {lat: 14.338, lng: 120.83},
  {lat: 14.353, lng: 120.803},
  {lat: 14.38, lng: 120.82}
];

export const DEFAULT_FREE_DELIVERY_SETTINGS: FreeDeliverySettings = {
  enabled: true,
  minSubtotal: 1500,
  zone: DEFAULT_FREE_DELIVERY_ZONE
};

const LECHON_CATEGORY_SET = new Set(
  LECHON_CATEGORIES.map(c => c.trim().toLowerCase())
);

export function isLechonCategory(category?: string | null): boolean {
  if (!category) return false;
  return LECHON_CATEGORY_SET.has(category.trim().toLowerCase());
}

export function isValidLatLng(p: unknown): p is LatLng {
  if (!p || typeof p !== 'object') return false;
  const {lat, lng} = p as {lat?: unknown; lng?: unknown};
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Ray-casting point-in-polygon test (fine at town scale). */
export function isPointInZone(point: LatLng, zone: LatLng[]): boolean {
  if (zone.length < 3) return false;
  let inside = false;
  for (let i = 0, j = zone.length - 1; i < zone.length; j = i++) {
    const a = zone[i];
    const b = zone[j];
    const crosses =
      a.lat > point.lat !== b.lat > point.lat &&
      point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (crosses) inside = !inside;
  }
  return inside;
}

export type DeliveryCartItem = {
  category?: string | null;
  /** Unit price actually charged (after promos). */
  price: number;
  quantity: number;
};

export type DeliveryContext = {
  buyer: 'guest' | 'customer';
  /** Pinned drop-off; without it the zone cannot be checked. */
  location?: LatLng | null;
  settings: FreeDeliverySettings;
};

export function getDeliveryMode(
  items: DeliveryCartItem[],
  ctx: DeliveryContext
): DeliveryMode {
  if (!items || items.length === 0) return 'LALAMOVE';
  if (ctx.buyer !== 'customer') return 'LALAMOVE';
  if (!ctx.settings.enabled) return 'LALAMOVE';
  if (!ctx.location || !isValidLatLng(ctx.location)) return 'LALAMOVE';
  if (!isPointInZone(ctx.location, ctx.settings.zone)) return 'LALAMOVE';

  const hasLechon = items.some(item => isLechonCategory(item.category));
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );

  return hasLechon || subtotal >= ctx.settings.minSubtotal
    ? 'DONCLAUDIO'
    : 'LALAMOVE';
}
