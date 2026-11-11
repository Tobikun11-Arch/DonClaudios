'use client';

import {useState} from 'react';
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
import {STORE_LOCATION, type LatLng} from '@/lib/orders/deliveryMode';
import {sanitizeInteger} from '@/lib/validation/numeric';
import {cn} from '@/lib/utils';

const MAX_MIN_SUBTOTAL = 1_000_000;

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

  return (
    <div className="space-y-6">
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
                  : 'Off. Every delivery is booked through Lalamove.'}
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
                are always free inside the area. Guests always book Lalamove.
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
                onClick={() => edit({zone: defaults.zone})}
                disabled={isDefaultZone || isSaving}
                className="shrink-0 self-start sm:self-auto"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to default area
              </Button>
            </div>

            <DeliveryZoneMap
              zone={form.zone}
              store={STORE_LOCATION}
              editableZone
              onZoneChange={zone => edit({zone})}
              className="mt-3 h-80 border border-gray-200 dark:border-gray-700 sm:h-96"
              ariaLabel="Free delivery area editor"
            />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="h-3.5 w-3.5" />
              {form.zone.length} corners
              {form.zone.length <= 3 && ' (minimum 3)'}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
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
            onClick={() => setDraft(null)}
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
