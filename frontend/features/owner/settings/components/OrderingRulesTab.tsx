'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  useOrderingRulesQuery,
  useUpdateOrderingRulesMutation
} from '@/lib/hooks/useOrderSchedule';
import {DEFAULT_ORDERING_RULES, type OrderingRules} from '@/lib/orders/orderSchedule';
import {sanitizeInteger} from '@/lib/validation/numeric';
import {formatMoney} from '@/lib/utils/formatNumber';
import {SettingRow} from './SettingRow';
import {enterNavigation} from '@/shared/utils/enterNavigation';
import {MoneyInput} from '@/shared/components/MoneyInput';

type Key = keyof OrderingRules;
type Draft = Record<Key, string>;

type Field = {key: Key; title: string; description: string; unit: string};

const SECTIONS: {title: string; subtitle: string; fields: Field[]}[] = [
  {
    title: 'Lead time',
    subtitle:
      'How much notice customers must give. Time slots come from Store Status: hourly, from 1 hour after opening to 1 hour before closing.',
    fields: [
      {
        key: 'bulkMinSubtotal',
        title: 'Bulk order from (₱)',
        description: 'Carts at or above this amount count as bulk: no ASAP, they must pre-order.',
        unit: '₱'
      },
      {
        key: 'bulkLeadHours',
        title: 'Bulk lead time',
        description: 'Minimum time between placing a bulk order and its time slot.',
        unit: 'hours'
      },
      {
        key: 'standardLeadMinutes',
        title: 'Regular pre-order lead time',
        description: 'Minimum notice for a small order scheduled for later.',
        unit: 'minutes'
      },
      {
        key: 'nextDayEarliestHoursAfterOpen',
        title: 'Next-day earliest slot',
        description:
          'Bulk / lechon ordered the day before: earliest slot is this many hours after opening (3 = 1 PM if you open at 10 AM).',
        unit: 'hours'
      },
      {
        key: 'lechonDefaultNoticeHours',
        title: 'Lechon default notice',
        description:
          'Used for the lechon categories unless a category or product has its own notice (Menu Categories / product editor).',
        unit: 'hours'
      },
      {
        key: 'deliveryExtraMinutes',
        title: 'Extra time for delivery',
        description: 'Added to the lead time of delivery orders for the trip.',
        unit: 'minutes'
      },
      {
        key: 'maxDaysAhead',
        title: 'Book up to',
        description: 'How many days ahead customers can schedule.',
        unit: 'days'
      }
    ]
  },
  {
    title: 'Payment deadline',
    subtitle:
      'For scheduled orders and pre-orders. The deadline is set when the cashier confirms, always falls within store hours, and is shown to the customer. Unpaid orders are cancelled automatically.',
    fields: [
      {
        key: 'paymentWindowHours',
        title: 'Time to pay',
        description: 'Normal time to pay the down payment or full amount after confirmation.',
        unit: 'hours'
      },
      {
        key: 'paymentMinWindowHours',
        title: 'At least',
        description: 'Customers always get at least this long to pay, even for orders due soon.',
        unit: 'hours'
      },
      {
        key: 'paymentCutoffHoursBeforeSlot',
        title: 'Paid before the slot',
        description: 'Payment should be in this many hours before the pick-up / dine-in time.',
        unit: 'hours'
      },
      {
        key: 'reminderMinutesBefore',
        title: 'Reminder',
        description: 'Customers get a reminder this long before the deadline (or halfway, if sooner).',
        unit: 'minutes'
      }
    ]
  }
];

function toDraft(rules: OrderingRules): Draft {
  return Object.fromEntries(
    (Object.keys(rules) as Key[]).map(k => [k, String(rules[k])])
  ) as Draft;
}

export function OrderingRulesTab() {
  const {data, rules, isLoading, isError} = useOrderingRulesQuery();
  const updateMutation = useUpdateOrderingRulesMutation();
  const limits = data?.limits;
  const [draft, setDraft] = useState<Draft | null>(null);

  const saved = toDraft(rules);
  const form = draft ?? saved;
  const isDirty = draft !== null && (Object.keys(saved) as Key[]).some(k => draft[k] !== saved[k]);

  const edit = (key: Key, value: string) =>
    setDraft(prev => ({...(prev ?? saved), [key]: sanitizeInteger(value).slice(0, 7)}));

  const handleSave = () => {
    const out = {} as OrderingRules;
    for (const key of Object.keys(DEFAULT_ORDERING_RULES) as Key[]) {
      const n = Number(form[key]);
      const [min, max] = limits?.[key] ?? [0, Number.MAX_SAFE_INTEGER];
      if (form[key].trim() === '' || !Number.isInteger(n) || n < min || n > max) {
        const field = SECTIONS.flatMap(s => s.fields).find(f => f.key === key);
        toast.error(`${field?.title ?? key} must be a whole number from ${min} to ${max.toLocaleString('en-PH')}.`);
        return;
      }
      out[key] = n;
    }
    updateMutation.mutate(out, {
      onSuccess: () => {
        setDraft(null);
        toast.success('Ordering rules saved.');
      },
      onError: err => toast.error(getFriendlyErrorMessage(err, 'Failed to save ordering rules'))
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6" onKeyDown={enterNavigation}>
      {isError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Could not load the saved ordering rules. Showing the default values.
        </p>
      )}
      {SECTIONS.map(section => (
        <div
          key={section.title}
          className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-700 dark:bg-gray-900"
        >
          <p className="text-base font-bold text-gray-900 dark:text-gray-100">{section.title}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{section.subtitle}</p>
          <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-700">
            {section.fields.map(f => (
              <SettingRow
                key={f.key}
                title={f.title}
                description={f.description}
                control={
                  <div className="flex items-center gap-2 sm:justify-end">
                    {f.unit === '₱' ? (
                      <MoneyInput
                        allowCents={false}
                        maxDigits={7}
                        aria-label={f.title}
                        value={form[f.key]}
                        onValueChange={n => edit(f.key, n == null ? '' : String(n))}
                        className="min-h-[44px] sm:w-28 tabular-nums"
                        placeholder={formatMoney(DEFAULT_ORDERING_RULES[f.key])}
                      />
                    ) : (
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label={f.title}
                        value={form[f.key]}
                        onChange={e => edit(f.key, e.target.value)}
                        className="min-h-[44px] sm:w-28 tabular-nums"
                        placeholder={String(DEFAULT_ORDERING_RULES[f.key])}
                      />
                    )}
                    <span className="w-14 shrink-0 text-left text-xs text-gray-500 dark:text-gray-400">
                      {f.unit === '₱' ? 'pesos' : f.unit}
                    </span>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {isDirty ? (
          <Button type="button" variant="outline" onClick={() => setDraft(null)}>
            Discard changes
          </Button>
        ) : null}
        <Button
          type="button"
          data-enter-submit="focus"
          disabled={!isDirty || updateMutation.isPending}
          onClick={handleSave}
          className="bg-[#3c5e45] text-white hover:bg-[#2d4a35]"
        >
          {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save ordering rules
        </Button>
      </div>
    </div>
  );
}
