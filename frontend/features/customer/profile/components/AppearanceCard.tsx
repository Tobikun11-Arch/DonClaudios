'use client';

import {useSyncExternalStore} from 'react';
import {useTheme} from 'next-themes';
import {Monitor, Moon, Sun} from 'lucide-react';
import {cn} from '@/lib/utils';

const OPTIONS = [
  {value: 'light', label: 'Light', icon: Sun},
  {value: 'dark', label: 'Dark', icon: Moon},
  {value: 'system', label: 'System', icon: Monitor}
] as const;

/** Light / Dark / System picker for the customer dashboard. */
export function AppearanceCard() {
  const {theme, setTheme} = useTheme();
  // The saved theme is only known on the client; avoid a hydration mismatch.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-lg font-bold text-[#2d4a35] dark:text-[#7ed4a0]">Appearance</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Choose light or dark, or follow your device setting.
      </p>
      <div
        role="radiogroup"
        aria-label="Color theme"
        className="mt-4 grid grid-cols-3 gap-2"
      >
        {OPTIONS.map(opt => {
          const Icon = opt.icon;
          const active = mounted && theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors sm:flex-row sm:gap-2 sm:text-sm',
                active
                  ? 'border-[#3c5e45] bg-[#3c5e45] text-white'
                  : 'border-gray-200 text-gray-600 hover:border-[#3c5e45]/50 hover:bg-[#e9f5ee] hover:text-[#2d4a35] dark:border-gray-700 dark:text-gray-300 dark:hover:border-[#7ed4a0]/40 dark:hover:bg-[#7ed4a0]/10 dark:hover:text-[#7ed4a0]'
              )}
            >
              <Icon className="h-4 w-4" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
