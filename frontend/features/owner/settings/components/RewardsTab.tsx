'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  useRewardsEarnQuery,
  useUpdateRewardsEarnMutation
} from '@/lib/hooks/useRewardsEarn';
import {sanitizeInteger} from '@/lib/validation/numeric';
import {
  buildEarnRateText,
  REWARDS_EARN_PESOS_MAX,
  REWARDS_EARN_PESOS_MIN,
  REWARDS_EARN_POINTS_MAX,
  REWARDS_EARN_POINTS_MIN
} from '@/config/rewards';
import {SettingRow} from './SettingRow';

/** Form values. Kept as strings so the fields can be cleared while typing. */
type Draft = {
  points: string;
  pesos: string;
};

function parseInRange(value: string, min: number, max: number): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export function RewardsTab() {
  const {rule, isLoading, isError} = useRewardsEarnQuery();
  const updateMutation = useUpdateRewardsEarnMutation();

  // Only holds the owner's unsaved edits; until they edit, the form shows the
  // saved values straight from the query.
  const [draft, setDraft] = useState<Draft | null>(null);

  const saved: Draft = {
    points: String(rule.rewardsEarnPoints),
    pesos: String(rule.rewardsEarnPesos)
  };
  const form = draft ?? saved;

  const isDirty =
    draft !== null && (draft.points !== saved.points || draft.pesos !== saved.pesos);

  const edit = (patch: Partial<Draft>) =>
    setDraft(prev => ({...(prev ?? saved), ...patch}));

  const points = parseInRange(form.points, REWARDS_EARN_POINTS_MIN, REWARDS_EARN_POINTS_MAX);
  const pesos = parseInRange(form.pesos, REWARDS_EARN_PESOS_MIN, REWARDS_EARN_PESOS_MAX);

  const handleSave = () => {
    if (points === null) {
      toast.error(
        `Points must be a whole number from ${REWARDS_EARN_POINTS_MIN} to ${REWARDS_EARN_POINTS_MAX.toLocaleString('en-PH')}.`
      );
      return;
    }
    if (pesos === null) {
      toast.error(
        `Peso amount must be a whole number from ${REWARDS_EARN_PESOS_MIN} to ${REWARDS_EARN_PESOS_MAX.toLocaleString('en-PH')}.`
      );
      return;
    }
    updateMutation.mutate(
      {rewardsEarnPoints: points, rewardsEarnPesos: pesos},
      {
        onSuccess: () => {
          setDraft(null);
          toast.success('Rewards settings saved.');
        },
        onError: err =>
          toast.error(getFriendlyErrorMessage(err, 'Failed to save rewards settings'))
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  const isSaving = updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
        {isError && (
          <p className="mb-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            Could not load the saved rewards settings. Showing the default values.
          </p>
        )}

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <SettingRow
            title="Points earned"
            description={`How many points a customer earns each time they reach the peso amount below (${REWARDS_EARN_POINTS_MIN} to ${REWARDS_EARN_POINTS_MAX.toLocaleString('en-PH')}).`}
            control={
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Points earned"
                value={form.points}
                onChange={e => edit({points: sanitizeInteger(e.target.value).slice(0, 4)})}
                className="min-h-[44px]"
                placeholder="1"
              />
            }
          />
          <SettingRow
            title="For every (₱)"
            description="The amount spent to earn those points. Delivery fees never earn points."
            control={
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="For every peso amount"
                value={form.pesos}
                onChange={e => edit({pesos: sanitizeInteger(e.target.value).slice(0, 6)})}
                className="min-h-[44px]"
                placeholder="1"
              />
            }
          />
        </div>

        <div className="mt-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {points !== null && pesos !== null ? (
            <>
              <span className="text-gray-500 dark:text-gray-400">Customers will see: </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {buildEarnRateText(points, pesos)}
              </span>
            </>
          ) : (
            <span className="text-amber-700 dark:text-amber-300">
              Enter whole numbers within the allowed range to see a preview.
            </span>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Applies to orders completed after you save. Points already earned stay the same.
          </p>
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
