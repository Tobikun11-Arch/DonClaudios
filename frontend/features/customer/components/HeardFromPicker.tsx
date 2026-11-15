'use client';

import {useState, useSyncExternalStore} from 'react';
import {
  HEARD_FROM_OPTIONS,
  getHeardFrom,
  setHeardFrom,
  type AcquisitionSource
} from '@/lib/acquisition';
import {cn} from '@/lib/utils';

const noopSubscribe = () => () => {};

/**
 * Optional "How did you hear about us?" chips. The answer is kept in the
 * browser and sent with sign-up / guest checkout. Never required: skipping it
 * is fine, and tapping the selected chip again clears it.
 */
export function HeardFromPicker({className}: {className?: string}) {
  // Saved answer from an earlier visit; null on the server so hydration matches.
  const stored = useSyncExternalStore(noopSubscribe, getHeardFrom, () => null);
  const [picked, setPicked] = useState<AcquisitionSource | null | undefined>(undefined);
  const value = picked === undefined ? stored : picked;

  const choose = (next: AcquisitionSource) => {
    const v = value === next ? null : next;
    setPicked(v);
    setHeardFrom(v);
  };

  return (
    <fieldset className={cn('space-y-2', className)}>
      <legend className="text-sm font-medium text-gray-900 dark:text-gray-100">
        How did you hear about us?{' '}
        <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {HEARD_FROM_OPTIONS.map(opt => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => choose(opt.value)}
              className={cn(
                'min-h-[36px] rounded-full border px-3.5 text-[0.8rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c5e45] focus-visible:ring-offset-1',
                selected
                  ? 'border-[#2d4a35] bg-[#2d4a35] text-white dark:border-[#3c5e45] dark:bg-[#3c5e45]'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
