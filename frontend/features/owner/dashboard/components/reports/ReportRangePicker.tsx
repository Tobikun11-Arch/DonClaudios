'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {CalendarDays, ChevronDown} from 'lucide-react';
import {cn} from '@/lib/utils';
import {REPORT_PRESETS} from '@/lib/types/report';
import type {ReportPreset, ReportRange} from '@/lib/types/report';

/**
 * Range selection is sent as Manila-time calendar dates. The browser's own
 * timezone is irrelevant: we never build a `Date` from these strings, we pass
 * them straight through as `YYYY-MM-DD` so the backend's Asia/Manila bucketing
 * is the single source of truth.
 */
function manilaToday() {
  // `en-CA` formats as YYYY-MM-DD, which is exactly the wire format we need.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function shiftManilaDate(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  const next = new Date(base + days * 86_400_000);
  return next.toISOString().slice(0, 10);
}

function prettyDate(iso?: string) {
  if (!iso) return 'Custom range';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function rangeLabel(range: ReportRange) {
  if (range.preset !== 'custom') {
    return REPORT_PRESETS.find(p => p.key === range.preset)?.label ?? 'Custom range';
  }
  return `${prettyDate(range.from)} – ${prettyDate(range.to)}`;
}

export function ReportRangePicker({
  value,
  onChange
}: {
  value: ReportRange;
  onChange: (range: ReportRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = useMemo(() => manilaToday(), []);

  const [draftFrom, setDraftFrom] = useState(value.from ?? shiftManilaDate(today, -29));
  const [draftTo, setDraftTo] = useState(value.to ?? today);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Re-seed the custom inputs when the popover opens, so they always reflect the
  // active range. Seeding on open (rather than in an effect) avoids a cascading
  // render on every range change.
  const toggleOpen = () => {
    if (!open) {
      if (value.preset === 'custom' && value.from) setDraftFrom(value.from);
      if (value.preset === 'custom' && value.to) setDraftTo(value.to);
    }
    setOpen(o => !o);
  };

  const maxDate = today;
  const invalid = draftFrom > draftTo;

  const applyCustom = () => {
    if (invalid) return;
    onChange({preset: 'custom', from: draftFrom, to: draftTo});
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
          open
            ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0" />
        <span className="max-w-[13rem] truncate">{rangeLabel(value)}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 mt-1 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
            Quick range
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {REPORT_PRESETS.map(preset => {
              const active = value.preset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    onChange({preset: preset.key as ReportPreset});
                    setOpen(false);
                  }}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                    active
                      ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-4 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
            Custom range
          </p>
          <label className="mb-2 block">
            <span className="mb-1 block text-[0.7rem] font-medium text-gray-500">From</span>
            <input
              type="date"
              value={draftFrom}
              max={draftTo}
              onChange={e => setDraftFrom(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-[0.7rem] font-medium text-gray-500">To</span>
            <input
              type="date"
              value={draftTo}
              max={maxDate}
              min={draftFrom}
              onChange={e => setDraftTo(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
            />
          </label>

          {invalid && (
            <p className="mb-2 text-[0.72rem] font-medium text-red-500">
              Start date must be on or before the end date.
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={invalid}
              onClick={applyCustom}
              className="flex-1 rounded-xl bg-[#2d4a35] px-3 py-2 text-xs font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply range
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftFrom(shiftManilaDate(today, -29));
                setDraftTo(today);
              }}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
          <p className="mt-2 text-[0.65rem] text-[#6B7280]">
            All dates are interpreted in Asia/Manila.
          </p>
        </div>
      )}
    </div>
  );
}
