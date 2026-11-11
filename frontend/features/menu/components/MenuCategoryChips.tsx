'use client';

import Image from 'next/image';
import {Sparkles, Tag} from 'lucide-react';
import {cn} from '@/lib/utils';
import {FEATURED_TAB_ID, PROMOS_TAB_ID, type MenuTab} from '../menuItems';

/** Chips with no category photo get an icon instead. */
const CHIP_ICONS = {[FEATURED_TAB_ID]: Sparkles, [PROMOS_TAB_ID]: Tag} as const;

/** Compact category chips, one scrolling row on every screen size. */
export function MenuCategoryChips({
  tabs,
  activeId,
  onSelect
}: {
  tabs: MenuTab[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Menu categories"
      className="flex gap-2 overflow-x-auto scrollbar-hide py-1"
    >
      {tabs.map(tab => {
        const active = tab.id === activeId;
        const ChipIcon = tab.imageUrl ? null : CHIP_ICONS[tab.id as keyof typeof CHIP_ICONS];
        const showIcon = !!ChipIcon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'flex h-10 shrink-0 items-center gap-2 rounded-full border pr-3.5 text-sm font-semibold whitespace-nowrap transition-colors',
              tab.imageUrl || showIcon ? 'pl-1' : 'pl-3.5',
              active
                ? 'border-[#2d4a35] bg-[#2d4a35] text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-700 hover:border-[#2d4a35]/40 hover:bg-[#2d4a35]/5 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
            )}
          >
            {tab.imageUrl ? (
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-100">
                <Image src={tab.imageUrl} alt="" fill sizes="32px" className="object-cover" />
              </span>
            ) : showIcon ? (
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                  active ? 'bg-white/15' : 'bg-[#2d4a35]/10 text-[#2d4a35] dark:text-[#7ed4a0]'
                )}
              >
                {ChipIcon && <ChipIcon className="h-4 w-4" />}
              </span>
            ) : null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
