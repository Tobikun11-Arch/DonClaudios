'use client';

import 'leaflet/dist/leaflet.css';
import {useEffect, useRef, useState} from 'react';
import type * as Leaflet from 'leaflet';
import type {LatLng} from '@/lib/orders/deliveryMode';
import {cn} from '@/lib/utils';

type Props = {
  /** Free-delivery polygon. */
  zone: LatLng[];
  store: LatLng;
  /** Customer drop-off pin. */
  pin?: LatLng | null;
  /** When set, the customer can click the map or drag their pin. */
  onPinChange?: (pin: LatLng) => void;
  /** Owner mode: click to add a corner, drag corners, double-click to remove. */
  editableZone?: boolean;
  onZoneChange?: (zone: LatLng[]) => void;
  /** Colours the customer pin (green inside the zone, amber outside). */
  pinInside?: boolean;
  className?: string;
  ariaLabel?: string;
};

const BRAND = '#3c5e45';

function pinHtml(color: string, label: string) {
  return `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center">
    <div style="background:${color};color:#fff;font:700 10px/1 system-ui,sans-serif;padding:4px 6px;border-radius:9999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">${label}</div>
    <svg width="22" height="28" viewBox="0 0 24 30" style="margin-top:-2px"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.5 12 30 12 30s12-9.5 12-18.3C24 5.2 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="12" cy="11.5" r="4" fill="#fff"/></svg>
  </div>`;
}

/** Index after which a new corner at `p` should be inserted (nearest edge). */
function nearestEdgeIndex(zone: LatLng[], p: LatLng): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < zone.length; i++) {
    const a = zone[i];
    const b = zone[(i + 1) % zone.length];
    const dx = b.lng - a.lng;
    const dy = b.lat - a.lat;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / len2));
    const cx = a.lng + t * dx;
    const cy = a.lat + t * dy;
    const d = (p.lng - cx) ** 2 + (p.lat - cy) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * Interactive OpenStreetMap (Leaflet) showing the free-delivery zone, the
 * store, and optionally the customer's pin. Leaflet needs `window`, so it is
 * loaded on the client only.
 */
export default function DeliveryZoneMap({
  zone,
  store,
  pin,
  onPinChange,
  editableZone = false,
  onZoneChange,
  pinInside,
  className,
  ariaLabel = 'Free delivery area map'
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const polygonRef = useRef<Leaflet.Polygon | null>(null);
  const pinRef = useRef<Leaflet.Marker | null>(null);
  const vertexLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  // Latest props for Leaflet event handlers registered once.
  const zoneRef = useRef(zone);
  const onPinChangeRef = useRef(onPinChange);
  const onZoneChangeRef = useRef(onZoneChange);
  const editableRef = useRef(editableZone);
  useEffect(() => {
    zoneRef.current = zone;
    onPinChangeRef.current = onPinChange;
    onZoneChangeRef.current = onZoneChange;
    editableRef.current = editableZone;
  });

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        // Clicks set the pin / add zone corners, so double-click must not zoom.
        doubleClickZoom: false,
        attributionControl: true
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      polygonRef.current = L.polygon(
        zoneRef.current.map(p => [p.lat, p.lng] as [number, number]),
        {color: BRAND, weight: 2, fillColor: BRAND, fillOpacity: 0.18, dashArray: '6 4'}
      ).addTo(map);

      L.marker([store.lat, store.lng], {
        icon: L.divIcon({className: '', html: pinHtml('#c30010', "DonClaudio's"), iconSize: [0, 0]}),
        keyboard: false,
        interactive: false
      }).addTo(map);

      vertexLayerRef.current = L.layerGroup().addTo(map);

      map.on('click', e => {
        const p = {lat: e.latlng.lat, lng: e.latlng.lng};
        if (editableRef.current) {
          const current = zoneRef.current;
          const at = nearestEdgeIndex(current, p) + 1;
          onZoneChangeRef.current?.([...current.slice(0, at), p, ...current.slice(at)]);
          return;
        }
        onPinChangeRef.current?.(p);
      });

      const bounds = polygonRef.current.getBounds();
      map.fitBounds(bounds, {padding: [16, 16]});
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      polygonRef.current = null;
      pinRef.current = null;
      vertexLayerRef.current = null;
    };
    // The store never moves while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zone outline + (owner) draggable corners.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map || !polygonRef.current || !vertexLayerRef.current) return;

    polygonRef.current.setLatLngs(zone.map(p => [p.lat, p.lng] as [number, number]));
    vertexLayerRef.current.clearLayers();
    if (!editableZone) return;

    zone.forEach((p, index) => {
      const handle = L.marker([p.lat, p.lng], {
        draggable: true,
        icon: L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;transform:translate(-50%,-50%);border-radius:9999px;background:#fff;border:3px solid ${BRAND};box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:move"></div>`,
          iconSize: [0, 0]
        }),
        title: 'Drag to move · double-click to remove'
      });
      handle.on('drag', e => {
        const ll = (e.target as Leaflet.Marker).getLatLng();
        const next = zoneRef.current.map((q, i) => (i === index ? [ll.lat, ll.lng] : [q.lat, q.lng])) as [number, number][];
        polygonRef.current?.setLatLngs(next);
      });
      handle.on('dragend', e => {
        const ll = (e.target as Leaflet.Marker).getLatLng();
        onZoneChangeRef.current?.(
          zoneRef.current.map((q, i) => (i === index ? {lat: ll.lat, lng: ll.lng} : q))
        );
      });
      handle.on('dblclick', e => {
        L.DomEvent.stop(e);
        if (zoneRef.current.length <= 3) return;
        onZoneChangeRef.current?.(zoneRef.current.filter((_, i) => i !== index));
      });
      vertexLayerRef.current?.addLayer(handle);
    });
  }, [ready, zone, editableZone]);

  // Customer pin.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    if (!pin) {
      pinRef.current?.remove();
      pinRef.current = null;
      return;
    }

    const color = pinInside === false ? '#d97706' : BRAND;
    const icon = L.divIcon({className: '', html: pinHtml(color, 'You'), iconSize: [0, 0]});
    if (!pinRef.current) {
      pinRef.current = L.marker([pin.lat, pin.lng], {
        icon,
        draggable: Boolean(onPinChangeRef.current),
        title: 'Your delivery location'
      }).addTo(map);
      pinRef.current.on('dragend', e => {
        const ll = (e.target as Leaflet.Marker).getLatLng();
        onPinChangeRef.current?.({lat: ll.lat, lng: ll.lng});
      });
      // Show both the zone and the pin the first time it appears.
      const bounds = polygonRef.current?.getBounds();
      if (bounds) map.fitBounds(bounds.extend([pin.lat, pin.lng]), {padding: [24, 24]});
    } else {
      pinRef.current.setLatLng([pin.lat, pin.lng]);
      pinRef.current.setIcon(icon);
    }
  }, [ready, pin, pinInside]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={ariaLabel}
      // `isolate` keeps Leaflet's high z-index panes below drawers and modals.
      className={cn('relative isolate z-0 h-64 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800', className)}
    />
  );
}
