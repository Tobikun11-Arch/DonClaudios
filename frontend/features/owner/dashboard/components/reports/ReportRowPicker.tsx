'use client';

import {useState} from 'react';
import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';
import {FilterSelect} from '@/shared/components/FilterPills';
import {ShareBar} from './reportPrimitives';

export type ReportRowOption = {
  /** Unique within the option set; also the `<select>` value. */
  value: string;
  label: string;
  secondary?: string | null;
};

export type ReportRowMetric = {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'danger';
  /** 0-100, renders a share bar beneath the value. */
  share?: number;
};

/**
 * Phone stand-in for a breakdown table. The tables are 420-520px wide and the
 * page has no horizontal room, so instead of scrolling sideways the owner picks
 * a row from a dropdown and reads that row's numbers as tiles.
 */
export function ReportRowPicker({
  options,
  metrics,
  pickerLabel,
  rank = false,
  summary
}: {
  options: ReportRowOption[];
  metrics: (option: ReportRowOption) => ReportRowMetric[];
  pickerLabel: string;
  rank?: boolean;
  summary?: ReactNode;
}) {
  const [picked, setPicked] = useState('');

  // Falling back to the first option keeps the control valid when the row set
  // changes (dimension switch, refetch) with no effect needed to reset it.
  const current = options.find(option => option.value === picked) ?? options[0];
  if (!current) return null;

  return (
    <div className="px-4 pb-5 sm:hidden">
      {summary}
      <FilterSelect
        value={current.value}
        onChange={setPicked}
        options={options.map((option, index) => ({
          value: option.value,
          label: rank ? `${index + 1}. ${option.label}` : option.label
        }))}
        ariaLabel={pickerLabel}
      />

      {current.secondary && (
        <p className="mt-1.5 text-[0.75rem] text-[#6B7280]">{current.secondary}</p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-2">
        {metrics(current).map(metric => (
          <div key={metric.label} className="rounded-lg bg-[#F7FAF6] px-3 py-2.5">
            <dt className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
              {metric.label}
            </dt>
            <dd
              className={cn(
                'mt-0.5 text-[1.05rem] font-bold tabular-nums',
                metric.tone === 'danger' ? 'text-red-500' : 'text-[#1A1A1A]'
              )}
            >
              {metric.value}
            </dd>
            {metric.share !== undefined && (
              <div className="mt-1.5">
                <ShareBar share={metric.share} />
              </div>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
