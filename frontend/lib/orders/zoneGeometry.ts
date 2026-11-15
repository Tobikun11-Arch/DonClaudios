import type {LatLng} from './deliveryMode';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance between two points, in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Point `km` away from `origin` along compass bearing `bearingDeg`. */
function destination(origin: LatLng, km: number, bearingDeg: number): LatLng {
  const d = km / EARTH_RADIUS_KM;
  const brng = toRad(bearingDeg);
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
  // 6 decimals ≈ 10 cm: plenty, and keeps the saved zone tidy.
  return {lat: +toDeg(lat2).toFixed(6), lng: +toDeg(lng2).toFixed(6)};
}

/** A `corners`-sided polygon approximating a circle of `km` around `center`. */
export function circleZone(center: LatLng, km: number, corners = 16): LatLng[] {
  return Array.from({length: corners}, (_, i) =>
    destination(center, km, (360 / corners) * i)
  );
}

/** Distance from `center` to the farthest corner of `zone`, in kilometres. */
export function farthestCornerKm(center: LatLng, zone: LatLng[]): number {
  return zone.reduce((max, p) => Math.max(max, distanceKm(center, p)), 0);
}
