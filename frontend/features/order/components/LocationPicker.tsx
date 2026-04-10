'use client';

import {useEffect, useRef, useState} from 'react';

const STORE = {
  lat: 14.39092185435405,
  lng: 120.8530823121149,
  name: "Don Claudio's Lechon House",
  embedSrc:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2422.9406044231473!2d120.8530823121149!3d14.39092185435405!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33962d2a919119a5%3A0xe5f912eb02ffd2f9!2sDon%20Claudio%E2%80%99s%20Lechon%20House!5e0!3m2!1sen!2sus!4v1775444344003!5m2!1sen!2sus'
};

export type LocationState = {
  lat: number | null;
  lng: number | null;
  address: string;
};

export default function LocationPicker({
  onConfirm
}: {
  onConfirm?: (location: LocationState) => void;
}) {
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    address: ''
  });
  const [mapSrc, setMapSrc] = useState(STORE.embedSrc);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildTwoPinSrc(userLat: number, userLng: number) {
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

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      return data?.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setPermissionDenied(true);
      setStatusMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setStatusMsg('Detecting your location…');

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const {latitude: lat, longitude: lng} = pos.coords;
        const address = await reverseGeocode(lat, lng);
        setLocation({lat, lng, address});
        setMapSrc(buildTwoPinSrc(lat, lng));
        setPermissionDenied(false);
        setStatusMsg('Location detected. Confirm when ready.');
        setIsLocating(false);
      },
      err => {
        setIsLocating(false);
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setStatusMsg('');
        } else {
          setPermissionDenied(true);
          setStatusMsg('Could not get location. Please type your address.');
        }
      },
      {enableHighAccuracy: true, timeout: 8000}
    );
  }

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchInput(value: string) {
    setLocation(prev => ({...prev, address: value}));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.length < 4) return;

    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            value
          )}&format=json&limit=1&countrycodes=ph`
        );
        const results = await res.json();
        if (results?.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          setLocation({lat, lng, address: value});
          setMapSrc(buildTwoPinSrc(lat, lng));
          setStatusMsg('Address found. Confirm when ready.');
        } else {
          setStatusMsg('Address not found. Try a more specific search.');
        }
      } catch {
        setStatusMsg('Search failed. Check your connection.');
      }
    }, 600);
  }

  function handleConfirm() {
    if (!location.lat) {
      setStatusMsg('Please allow location access or type your address first.');
      return;
    }
    setConfirmed(true);
    setStatusMsg(`${STORE.name} will deliver to your address.`);
    onConfirm?.(location);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-3xl mx-auto shadow-sm">
      <h2 className="text-xl font-semibold text-center text-gray-900 mb-1">
        Enter Location
      </h2>
      <p className="text-sm text-center text-gray-500 mb-5">
        Enter your delivery address to find the store nearest you.
      </p>

      {permissionDenied && (
        <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
          <svg
            className="w-4 h-4 mt-0.5 shrink-0 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          <p className="text-sm text-gray-600 flex-1">
            Location access was denied. Type your delivery address in the search
            box below.
          </p>
          <button
            onClick={requestLocation}
            className="text-xs border border-gray-300 rounded-full px-3 py-1 hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            Try again
          </button>
        </div>
      )}

      <div className="relative mb-3">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          type="text"
          value={location.address}
          onChange={e => handleSearchInput(e.target.value)}
          placeholder="Search for your address here."
          className="w-full pl-10 pr-12 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
        />

        <button
          onClick={requestLocation}
          disabled={isLocating}
          title="Use my current location"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
        >
          {isLocating ? (
            <svg
              className="w-5 h-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
              <circle cx="12" cy="12" r="9" strokeDasharray="2 3" />
            </svg>
          )}
        </button>
      </div>

      <p className="text-xs text-red-500 text-center mb-2">
        Move/drag the map below if the pinned location is incorrect.
      </p>

      <div className="w-full h-72 rounded-xl overflow-hidden border border-gray-200">
        <iframe
          src={mapSrc}
          className="w-full h-full"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Delivery location map"
        />
      </div>

      <button
        onClick={handleConfirm}
        disabled={confirmed}
        className={`mt-4 w-full py-3 rounded-full text-sm font-semibold transition-all ${
          confirmed
            ? 'bg-[#3c5e45] text-white cursor-default'
            : location.lat
            ? 'bg-[#3c5e45]  text-white hover:bg-gray-700 active:scale-[0.98]'
            : 'bg-[#3c5e45] text-gray-400 cursor-not-allowed'
        }`}
      >
        {confirmed ? 'Location Confirmed ✓' : 'Confirm Location'}
      </button>

      {statusMsg && (
        <p
          className={`text-xs text-center mt-2 ${
            statusMsg.includes('not found') ||
            statusMsg.includes('failed') ||
            statusMsg.includes('first')
              ? 'text-red-500'
              : 'text-gray-500'
          }`}
        >
          {statusMsg}
        </p>
      )}
    </div>
  );
}
