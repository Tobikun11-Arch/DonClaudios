'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  downPaymentFor,
  useDownPaymentQuery,
  useUpdateDownPaymentMutation
} from '@/lib/hooks/useDownPayment';
import {sanitizeInteger} from '@/lib/validation/numeric';
import {SettingRow} from './SettingRow';
import {enterNavigation} from '@/shared/utils/enterNavigation';

const PRESETS = [20, 30, 50, 70];
const EXAMPLE_TOTAL = 10_000;

const peso = (n: number) =>
  `₱${n.toLocaleString('en-PH', {maximumFractionDigits: 0})}`;

export function PaymentsTab() {
  const {percent, limits, isLoading, isError} = useDownPaymentQuery();
  const updateMutation = useUpdateDownPaymentMutation();
  // Only the owner's unsaved edit; otherwise the saved value is shown.
  const [draft, setDraft] = useState<string | null>(null);

  const value = draft ?? String(percent);
  const parsed = value.trim() === '' ? null : Number(value);
  const valid =
    parsed !== null && Number.isInteger(parsed) && parsed >= limits.min && parsed <= limits.max;
  const isDirty = draft !== null && draft !== String(percent);
  const isSaving = updateMutation.isPending;

  const handleSave = () => {
    if (!valid || parsed === null) {
      toast.error(`Enter a whole percent from ${limits.min} to ${limits.max}.`);
      return;
    }
    updateMutation.mutate(parsed, {
      onSuccess: data => {
        setDraft(null);
        const n = data.ordersUpdated ?? 0;
        toast.success(
          n > 0
            ? `Down payment set to ${parsed}%. Updated ${n} unpaid order${n === 1 ? '' : 's'}.`
            : `Down payment set to ${parsed}%.`
        );
      },
      onError: err => toast.error(getFriendlyErrorMessage(err, 'Failed to save down payment'))
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6" onKeyDown={enterNavigation}>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
        {isError && (
          <p className="mb-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            Could not load the saved down payment. Showing the default ({limits.default}%).
          </p>
        )}

        <SettingRow
          title="Pre-order down payment (%)"
          description={`Share of a pre-order the customer pays up front to lock it in. The rest is paid before or at pickup. Allowed: ${limits.min}% to ${limits.max}%.`}
          control={
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                aria-label="Down payment percent"
                value={value}
                onChange={e => setDraft(sanitizeInteger(e.target.value).slice(0, 2))}
                className="min-h-[44px] pr-8"
                placeholder={String(limits.default)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                %
              </span>
            </div>
          }
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.filter(p => p >= limits.min && p <= limits.max).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setDraft(String(p))}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                parsed === p
                  ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              {p}%
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {valid && parsed !== null ? (
            <>
              <span className="text-gray-500 dark:text-gray-400">Example: on a {peso(EXAMPLE_TOTAL)} pre-order, the customer pays </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {peso(downPaymentFor(EXAMPLE_TOTAL, parsed))} now
              </span>
              <span className="text-gray-500 dark:text-gray-400"> and </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {peso(EXAMPLE_TOTAL - downPaymentFor(EXAMPLE_TOTAL, parsed))} later
              </span>
              .
            </>
          ) : (
            <span className="text-amber-700 dark:text-amber-300">
              Enter a whole percent from {limits.min} to {limits.max} to see a preview.
            </span>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Applies to new pre-orders and to every open order that has not paid anything yet.
            Orders that already paid a down payment or the full amount keep their percent, and so
            do orders the customer is in the middle of paying online. On an approved late
            cancellation, the store keeps the order&apos;s down payment share.
          </p>
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
