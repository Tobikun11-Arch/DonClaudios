'use client';

import {useState, type ComponentType} from 'react';
import {toast} from 'sonner';
import {CalendarDays, Loader2, ShoppingBag, Truck, UtensilsCrossed} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  downPaymentFor,
  useDownPaymentQuery,
  useUpdateDownPaymentMutation
} from '@/lib/hooks/useDownPayment';
import {
  DOWN_PAYMENT_FLOWS,
  type DownPaymentFlow,
  type DownPaymentMode,
  type DownPaymentRules
} from '@/lib/payment/downPaymentRules';
import {sanitizeInteger} from '@/lib/validation/numeric';
import {SettingDivider, SettingRow} from './SettingRow';
import {enterNavigation} from '@/shared/utils/enterNavigation';

const PRESETS = [20, 30, 50, 70];
const EXAMPLE_TOTAL = 10_000;

const peso = (n: number) => `₱${n.toLocaleString('en-PH', {maximumFractionDigits: 0})}`;

type FlowMeta = {
  title: string;
  icon: ComponentType<{className?: string}>;
  /** What "Customer chooses" means for this flow. */
  about: string;
  /** When the rest is paid. */
  later: string;
  laterShort: string;
  /** Modes offered. "Required" only matters where everything can be paid later. */
  modes: DownPaymentMode[];
  note?: string;
};

const FLOWS: Record<DownPaymentFlow, FlowMeta> = {
  preorder: {
    title: 'Holiday pre-orders',
    icon: CalendarDays,
    about: 'Dated pre-orders, and carts made only of pre-order products.',
    later: 'The rest is paid before or at pickup: cash at pickup, online, or at the store.',
    laterShort: 'later',
    modes: ['off', 'optional'],
    note: 'On an approved late cancellation or a no-show, the store keeps the down payment.'
  },
  pickup: {
    title: 'Pick-up',
    icon: ShoppingBag,
    about: 'Regular menu orders picked up at the store.',
    later: 'The rest is paid at pick-up in cash, online, or at the store.',
    laterShort: 'at pick-up',
    modes: ['off', 'optional', 'required'],
    note: 'Required hides "Cash on pick-up" (pay nothing now) for these orders. Customers who already chose it keep it. If the customer never picks up, the store keeps the down payment.'
  },
  delivery: {
    title: 'Delivery',
    icon: Truck,
    about: 'Regular menu orders delivered to the customer.',
    later: 'The rest must be paid online or at the store before the rider leaves.',
    laterShort: 'before the rider leaves',
    modes: ['off', 'optional']
  },
  reservation: {
    title: 'Reservation',
    icon: UtensilsCrossed,
    about: 'Regular menu orders for a reservation.',
    later: 'The rest is paid at the store in cash, or online, before the order is completed.',
    laterShort: 'at the store',
    modes: ['off', 'optional'],
    note: 'If the customer never shows up, the store keeps the down payment.'
  }
};

const MODE_LABEL: Record<DownPaymentMode, string> = {
  off: 'Full payment only',
  optional: 'Customer chooses',
  required: 'Required'
};

type RuleDraft = {mode: DownPaymentMode; percent: string; minOrder: string};
type Draft = Record<DownPaymentFlow, RuleDraft>;

function toDraft(rules: DownPaymentRules, flows = FLOWS): Draft {
  const out = {} as Draft;
  for (const flow of DOWN_PAYMENT_FLOWS) {
    const r = rules[flow];
    // A mode this flow does not offer (e.g. "required" on delivery) acts like "optional".
    const mode = flows[flow].modes.includes(r.mode) ? r.mode : 'optional';
    out[flow] = {mode, percent: String(r.percent), minOrder: r.minOrder > 0 ? String(r.minOrder) : ''};
  }
  return out;
}

function parsePercent(v: string) {
  return v.trim() === '' ? null : Number(v);
}

export function PaymentsTab() {
  const {rules, limits, isLoading, isError} = useDownPaymentQuery();
  const updateMutation = useUpdateDownPaymentMutation();
  // Only the owner's unsaved edits; otherwise the saved rules are shown.
  const [draft, setDraft] = useState<Draft | null>(null);

  const saved = toDraft(rules);
  const form = draft ?? saved;
  const isDirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);
  const isSaving = updateMutation.isPending;

  const percentValid = (r: RuleDraft) => {
    if (r.mode === 'off') return true;
    const p = parsePercent(r.percent);
    return p !== null && Number.isInteger(p) && p >= limits.min && p <= limits.max;
  };
  const minOrderValue = (r: RuleDraft) => (r.minOrder.trim() === '' ? 0 : Number(r.minOrder));
  const minOrderValid = (r: RuleDraft) =>
    r.mode === 'off' || (Number.isInteger(minOrderValue(r)) && minOrderValue(r) <= limits.minOrderMax);
  const allValid = DOWN_PAYMENT_FLOWS.every(f => percentValid(form[f]) && minOrderValid(form[f]));

  const patch = (flow: DownPaymentFlow, change: Partial<RuleDraft>) =>
    setDraft(prev => {
      const base = prev ?? saved;
      return {...base, [flow]: {...base[flow], ...change}};
    });

  const handleSave = () => {
    const bad = DOWN_PAYMENT_FLOWS.find(f => !percentValid(form[f]) || !minOrderValid(form[f]));
    if (bad) {
      toast.error(
        !percentValid(form[bad])
          ? `${FLOWS[bad].title}: enter a whole percent from ${limits.min} to ${limits.max}.`
          : `${FLOWS[bad].title}: the minimum order can be up to ${peso(limits.minOrderMax)}.`
      );
      return;
    }
    const next = {} as DownPaymentRules;
    for (const flow of DOWN_PAYMENT_FLOWS) {
      const r = form[flow];
      next[flow] = {
        mode: r.mode,
        // Off keeps the last percent, so turning it back on restores it.
        percent: r.mode === 'off' && !percentValid({...r, mode: 'optional'}) ? rules[flow].percent : Number(r.percent),
        minOrder: minOrderValue(r)
      };
    }
    updateMutation.mutate(next, {
      onSuccess: data => {
        setDraft(null);
        const n = data.ordersUpdated ?? 0;
        toast.success(
          n > 0
            ? `Down payment settings saved. Updated ${n} unpaid order${n === 1 ? '' : 's'}.`
            : 'Down payment settings saved.'
        );
      },
      onError: err => toast.error(getFriendlyErrorMessage(err, 'Failed to save down payment settings'))
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" onKeyDown={enterNavigation}>
      {isError && (
        <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          Could not load the saved down payment settings. Showing the defaults.
        </p>
      )}

      {DOWN_PAYMENT_FLOWS.map(flow => {
        const meta = FLOWS[flow];
        const r = form[flow];
        const Icon = meta.icon;
        const on = r.mode !== 'off';
        const pct = parsePercent(r.percent);
        const pctOk = percentValid(r);
        const minOrder = minOrderValue(r);
        const exampleTotal = Math.max(EXAMPLE_TOTAL, minOrder);
        const flowLabel = flow === 'preorder' ? 'pre-order' : `${meta.title.toLowerCase()} order`;

        return (
          <section
            key={flow}
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2d4a35]/10 text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{meta.title}</h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{meta.about}</p>
                </div>
              </div>
              <div
                role="radiogroup"
                aria-label={`${meta.title} down payment`}
                className="flex shrink-0 flex-wrap gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800"
              >
                {meta.modes.map(mode => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={r.mode === mode}
                    onClick={() => patch(flow, {mode})}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      r.mode === mode
                        ? 'bg-[#2d4a35] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                    }`}
                  >
                    {MODE_LABEL[mode]}
                  </button>
                ))}
              </div>
            </div>

            {on ? (
              <div className="mt-2">
                <SettingRow
                  title="Down payment (%)"
                  description={`Share paid up front. ${meta.later} Allowed: ${limits.min}% to ${limits.max}%.`}
                  control={
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        aria-label={`${meta.title} down payment percent`}
                        value={r.percent}
                        onChange={e => patch(flow, {percent: sanitizeInteger(e.target.value).slice(0, 2)})}
                        className="min-h-[44px] pr-8"
                        placeholder={String(limits.default)}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                        %
                      </span>
                    </div>
                  }
                />
                <div className="flex flex-wrap gap-2 pb-3">
                  {PRESETS.filter(p => p >= limits.min && p <= limits.max).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => patch(flow, {percent: String(p)})}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        pct === p
                          ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
                <SettingDivider />
                <SettingRow
                  title="Minimum order"
                  description="Only orders of at least this total can pay a down payment. Leave empty for all orders."
                  control={
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                        ₱
                      </span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label={`${meta.title} minimum order for a down payment`}
                        value={r.minOrder}
                        onChange={e => patch(flow, {minOrder: sanitizeInteger(e.target.value).slice(0, 7)})}
                        className="min-h-[44px] pl-7"
                        placeholder="All orders"
                      />
                    </div>
                  }
                />

                <div className="mt-1 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {pctOk && pct !== null ? (
                    <>
                      <span className="text-gray-500 dark:text-gray-400">
                        Example: on a {peso(exampleTotal)} {flowLabel}, the customer
                        {r.mode === 'required' ? ' must pay ' : ' can pay '}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {peso(downPaymentFor(exampleTotal, pct))} now
                      </span>
                      <span className="text-gray-500 dark:text-gray-400"> and </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {peso(exampleTotal - downPaymentFor(exampleTotal, pct))} {meta.laterShort}
                      </span>
                      .
                    </>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-300">
                      Enter a whole percent from {limits.min} to {limits.max} to see a preview.
                    </span>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {minOrder > 0
                      ? `Orders below ${peso(minOrder)} pay the full amount. `
                      : ''}
                    {meta.note ?? ''}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                {flow === 'preorder'
                  ? 'Customers pay the full pre-order amount up front.'
                  : 'Customers pay the full amount. Turn on "Customer chooses" to allow a down payment.'}
              </p>
            )}
          </section>
        );
      })}

      <div className="sticky bottom-4 z-10 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 px-5 py-3 shadow-sm backdrop-blur">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Changes apply to new orders and to open orders that have not paid anything yet. Orders that
          already paid, or are in the middle of paying online, keep their percent.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            data-enter-submit
            onClick={handleSave}
            disabled={!isDirty || isSaving || !allValid}
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
          {isDirty && <span className="text-xs text-gray-500 dark:text-gray-400">Unsaved changes</span>}
        </div>
      </div>
    </div>
  );
}
