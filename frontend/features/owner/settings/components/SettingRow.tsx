'use client';

import {ReactNode} from 'react';
import {cn} from '@/lib/utils';

/**
 * OpenCode-style setting row: title + description on the left, control on the right.
 * Rows are meant to be stacked inside a rounded card and separated by hairline dividers.
 */
export function SettingRow({
  title,
  description,
  control,
  className
}: {
  title: string;
  description?: string;
  control: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {description && (
          <div className="mt-0.5 text-xs text-gray-500">{description}</div>
        )}
      </div>
      <div className="shrink-0 sm:w-[240px] sm:text-right">{control}</div>
    </div>
  );
}

export function SettingDivider() {
  return <div className="border-t border-gray-100" />;
}
