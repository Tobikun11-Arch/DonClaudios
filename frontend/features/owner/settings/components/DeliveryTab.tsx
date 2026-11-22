'use client';

import {useMemo, useState} from 'react';
import {toast} from 'sonner';
import {Loader2, MapPin, RotateCcw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import DeliveryZoneMap from '@/features/order/components/DeliveryZoneMap';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  useFreeDeliveryQuery,
  useUpdateFreeDeliveryMutation
} from '@/lib/hooks/useFreeDelivery';
import {STORE_LOCATION, isPointInZone, type LatLng} from '@/lib/orders/deliveryMode';
import {circleZone, farthestCornerKm} from '@/lib/orders/zoneGeometry';
import {useDeliveryHeatmapQuery} from '@/lib/hooks/report/useReport';
import type {DeliveryHeatmapDays} from '@/lib/types/report';
import {sanitizeInteger} from '@/lib/validation/numeric';
import {cn} from '@/lib/utils';
import {enterNavigation} from '@/shared/utils/enterNavigation';

const MAX_MIN_SUBTOTAL = 1_000_000;
const MIN_RANGE_KM = 0.5;
const MAX_RANGE_KM = 30;
const QUICK_RANGES = [3, 5, 8];
const HEAT_PERIODS: {value: DeliveryHeatmapDays; label: string}[] = [
  {value: '30', label: '30 days'},
  {value: '90', label: '90 days'},
  {value: 'all', label: 'All time'}
];

/** Digits and one decimal point, at most 4 characters ("12.5"). */
function sanitizeKm(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return (rest.length ? `${whole}.${rest.join('')}` : whole).slice(0, 4);
}

/** Form values. The minimum stays a string so the field can be cleared while typing. */
type Draft = {
  enabled: boolean;
  minSubtotal: string;
  zone: LatLng[];
};

function Toggle({
  on,
  onChange,
  label
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c5e45] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
        on ? 'bg-[#2d4a35] dark:bg-[#3c5e45]' : 'bg-gray-300 dark:bg-gray-600'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

function sameZone(a: LatLng[], b: LatLng[]) {
  return (
    a.length === b.length &&
    a.every((p, i) => p.lat === b[i].lat && p.lng === b[i].lng)
  );
}

export function DeliveryTab() {
  const {settings, defaults, isLoading, isError} = useFreeDeliveryQuery();
  const updateMutation = useUpdateFreeDeliveryMutation();

  // Only holds the owner's unsaved edits; until they edit, the form shows the
  // saved values straight from the query, so nothing is reset on re-render.
  const [draft, setDraft] = useState<Draft | null>(null);

  // Km range: the typed text, and the radius whose circle was last applied.
  const [rangeInput, setRangeInput] = useState('');
  const [guideKm, setGuideKm] = useState<number | null>(null);

  // Customer density overlay.
  const [showHeat, setShowHeat] = useState(false);
  const [heatDays, setHeatDays] = useState<DeliveryHeatmapDays>('90');
  const heatQuery = useDeliveryHeatmapQuery(heatDays, showHeat);

  const saved: Draft = {
    enabled: settings.enabled,
    minSubtotal: String(settings.minSubtotal),
    zone: settings.zone
  };
  const form = draft ?? saved;

  const isDirty =
    draft !== null &&
    (draft.enabled !== saved.enabled ||
      draft.minSubtotal !== saved.minSubtotal ||
      !sameZone(draft.zone, saved.zone));

  const edit = (patch: Partial<Draft>) =>
    setDraft(prev => ({...(prev ?? saved), ...patch}));

  const clearRange = () => {
    setRangeInput('');
    setGuideKm(null);
  };

  /** Redraws the area as a 16-corner circle of `km` around the store. */
  const applyRange = (km: number) => {
    setGuideKm(km);
    edit({zone: circleZone(STORE_LOCATION, km)});
  };

  const handleRangeInput = (value: string) => {
    const text = sanitizeKm(value);
    setRangeInput(text);
    const km = Number(text);
    if (text !== '' && Number.isFinite(km) && km >= MIN_RANGE_KM && km <= MAX_RANGE_KM) {
      applyRange(km);
    }
  };

  const rangeKm = Number(rangeInput);
  const rangeInvalid =
    rangeInput !== '' &&
    !(Number.isFinite(rangeKm) && rangeKm >= MIN_RANGE_KM && rangeKm <= MAX_RANGE_KM);

  const heatPoints = showHeat ? (heatQuery.data?.points ?? null) : null;
  const heatInside = useMemo(() => {
    if (!heatPoints) return 0;
    return heatPoints.reduce(
      (n, p) => n + (isPointInZone({lat: p.lat, lng: p.lng}, form.zone) ? p.count : 0),
      0
    );
  }, [heatPoints, form.zone]);
  const heatTotal = heatQuery.data?.totalOrders ?? 0;

  const handleSave = () => {
    if (form.minSubtotal.trim() === '') {
      toast.error('Enter a minimum order amount.');
      return;
    }
    const minSubtotal = Number(form.minSubtotal);
    if (!Number.isInteger(minSubtotal) || minSubtotal < 0 || minSubtotal > MAX_MIN_SUBTOTAL) {
      toast.error('Minimum order must be a whole number from 0 to 1,000,000.');
      return;
    }
    if (form.zone.length < 3) {
      toast.error('The free delivery area needs at least 3 corners.');
      return;
    }
    updateMutation.mutate(
      {enabled: form.enabled, minSubtotal, zone: form.zone},
      {
        onSuccess: () => {
          setDraft(null);
          toast.success('Delivery settings saved.');
        },
        onError: err =>
          toast.error(getFriendlyErrorMessage(err, 'Failed to save delivery settings'))
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <div className="h-6 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 sm:h-96" />
      </div>
    );
  }

  const isDefaultZone = sameZone(form.zone, defaults.zone);
  const isSaving = updateMutation.isPending;
  const farthestKm = farthestCornerKm(STORE_LOCATION, form.zone);
  const isCircle = guideKm !== null && sameZone(form.zone, circleZone(STORE_LOCATION, guideKm));

  return (
    <div className="space-y-6" onKeyDown={enterNavigation}>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <h2 className="mb-1 text-lg font-bold text-[#2d4a35] dark:text-[#7ed4a0]">
          Free Delivery
        </h2>
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          Customers with an account get free delivery by our own rider when they pin a
          location inside the area.
        </p>
        {isError && (
          <p className="mb-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            Could not load the saved delivery settings. Showing the default values.
          </p>
        )}

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <div className="flex items-center justify-between gap-6 py-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Free delivery
              </div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {form.enabled
                  ? 'On. Qualifying orders inside the area are delivered free.'
                  : 'Off. Customers book their own courier (Lalamove, Grab Express, Move It) for every delivery.'}
              </div>
            </div>
            <Toggle
              on={form.enabled}
              onChange={v => edit({enabled: v})}
              label="Free delivery"
            />
          </div>

          <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="free-delivery-min"
                className="text-sm font-semibold text-gray-900 dark:text-gray-100"
              >
                Minimum order for free delivery (₱)
              </label>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Lechon de Leche, Traditional Lechon, Cochinillo and Lechon Belly orders
                are always free inside the area. Guests always book their own courier.
              </div>
            </div>
            <div className="shrink-0 sm:w-[200px]">
              <Input
                id="free-delivery-min"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.minSubtotal}
                onChange={e => edit({minSubtotal: sanitizeInteger(e.target.value).slice(0, 7)})}
                className="min-h-[44px]"
                placeholder="0"
              />
            </div>
          </div>

          <div className="py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Free delivery area
                </div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Click the map to add a corner, drag corners to move them, double-click a
                  corner to remove it.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  edit({zone: defaults.zone});
                  clearRange();
                }}
                disabled={isDefaultZone || isSaving}
                className="shrink-0 self-start sm:self-auto"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to default area
              </Button>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label
                  htmlFor="free-delivery-range"
                  className="text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  Range from the store (km)
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="relative w-28">
                    <Input
                      id="free-delivery-range"
                      type="text"
                      inputMode="decimal"
                      value={rangeInput}
                      onChange={e => handleRangeInput(e.target.value)}
                      placeholder={farthestKm.toFixed(1)}
                      aria-invalid={rangeInvalid}
                      aria-describedby="free-delivery-range-hint"
                      className={cn(
                        'min-h-[40px] pr-9',
                        rangeInvalid && 'border-red-400 focus-visible:ring-red-400'
                      )}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      km
                    </span>
                  </div>
                  {QUICK_RANGES.map(km => {
                    const active = isCircle && guideKm === km;
                    return (
                      <button
                        key={km}
                        type="button"
                        onClick={() => {
                          setRangeInput(String(km));
                          applyRange(km);
                        }}
                        aria-pressed={active}
                        className={cn(
                          'min-h-[36px] rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c5e45]',
                          active
                            ? 'border-[#2d4a35] bg-[#2d4a35] text-white dark:border-[#3c5e45] dark:bg-[#3c5e45]'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                        )}
                      >
                        {km} km
                      </button>
                    );
                  })}
                </div>
                <p
                  id="free-delivery-range-hint"
                  className={cn(
                    'mt-1 text-[0.7rem]',
                    rangeInvalid
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {rangeInvalid
                    ? `Enter ${MIN_RANGE_KM} to ${MAX_RANGE_KM} km.`
                    : guideKm !== null && !isCircle
                      ? `Custom shape · farthest corner ${farthestKm.toFixed(1)} km (red ring = ${guideKm} km)`
                      : guideKm !== null
                        ? `Circle of ${guideKm} km. Drag any corner to fit roads or the shore.`
                        : `Type a range to redraw the area as a circle. Farthest corner now: ${farthestKm.toFixed(1)} km.`}
                </p>
              </div>

              <div className="flex items-center gap-3 sm:justify-end">
                <div className="sm:text-right">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Customer density
                  </div>
                  <div className="text-[0.7rem] text-gray-500 dark:text-gray-400">
                    Where delivery orders were pinned
                  </div>
                </div>
                <Toggle on={showHeat} onChange={setShowHeat} label="Show customer density" />
              </div>
            </div>

            <DeliveryZoneMap
              zone={form.zone}
              store={STORE_LOCATION}
              editableZone
              onZoneChange={zone => edit({zone})}
              guideRadiusKm={guideKm}
              heatPoints={heatPoints}
              className="mt-3 h-80 border border-gray-200 dark:border-gray-700 sm:h-96"
              ariaLabel="Free delivery area editor"
            />
            <div className="mt-2 flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {form.zone.length} corners
                {form.zone.length <= 3 && ' (minimum 3)'}
              </p>

              {showHeat && (
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    role="group"
                    aria-label="Density period"
                    className="flex gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5"
                  >
                    {HEAT_PERIODS.map(period => (
                      <button
                        key={period.value}
                        type="button"
                        aria-pressed={heatDays === period.value}
                        onClick={() => setHeatDays(period.value)}
                        className={
                          heatDays === period.value
                            ? 'rounded-full bg-[#2d4a35] px-2.5 py-1 text-[0.7rem] font-bold text-white'
                            : 'rounded-full px-2.5 py-1 text-[0.7rem] font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                        }
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                  <span className="flex items-center gap-1.5" aria-hidden="true">
                    Fewer
                    <span className="h-2 w-20 rounded-full bg-[linear-gradient(90deg,#4A7C35,#A8CC8C,#F4B400,#F97316,#DC2626)]" />
                    More
                  </span>
                </div>
              )}
            </div>

            {showHeat && (
              <p
                className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-xs text-gray-600 dark:text-gray-300"
                aria-live="polite"
              >
                {heatQuery.isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading customer density…
                  </span>
                ) : heatQuery.isError ? (
                  'Could not load customer density.'
                ) : heatTotal === 0 ? (
                  'No pinned delivery orders in this period yet.'
                ) : (
                  <>
                    <span className="font-semibold tabular-nums">{heatTotal.toLocaleString()}</span>{' '}
                    delivery {heatTotal === 1 ? 'order' : 'orders'} ·{' '}
                    <span className="font-semibold tabular-nums">
                      {Math.round((heatInside / heatTotal) * 100)}%
                    </span>{' '}
                    inside the area shown. Hot spots outside the line are customers you could
                    reach by moving a corner. Locations are rounded to about 100 m.
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            data-enter-submit
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="bg-[#2d4a35] hover:bg-[#3c5e45] dark:text-white"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft(null);
              clearRange();
            }}
            disabled={!isDirty || isSaving}
          >
            Cancel
          </Button>
          {isDirty && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
}
