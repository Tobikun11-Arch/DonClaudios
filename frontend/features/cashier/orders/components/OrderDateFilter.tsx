'use client';

import {useEffect, useRef, useState} from 'react';
import {CalendarDays, X} from 'lucide-react';
import {cn} from '@/lib/utils';

export type DateRange = {from: number | null; to: number | null};

const DAY_MS = 86400000;

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function toInputValue(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromInputValue(value: string): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? null : ts;
}

const PRESETS = [
  {key: 'all', label: 'All time'},
  {key: 'today', label: 'Today'},
  {key: 'yesterday', label: 'Yesterday'},
  {key: '7d', label: 'Last 7 days'},
  {key: '30d', label: 'Last 30 days'}
] as const;

type PresetKey = (typeof PRESETS)[number]['key'];

function presetRange(key: PresetKey, now = Date.now()): DateRange {
  switch (key) {
    case 'today':
      return {from: startOfDay(now), to: endOfDay(now)};
    case 'yesterday': {
      const y = now - DAY_MS;
      return {from: startOfDay(y), to: endOfDay(y)};
    }
    case '7d':
      return {from: startOfDay(now - 6 * DAY_MS), to: endOfDay(now)};
    case '30d':
      return {from: startOfDay(now - 29 * DAY_MS), to: endOfDay(now)};
    default:
      return {from: null, to: null};
  }
}

function isSameRange(a: DateRange, b: DateRange) {
  return a.from === b.from && a.to === b.to;
}

function formatStamp(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function rangeLabel(range: DateRange, now: number) {
  if (range.from === null && range.to === null) return 'Any date';
  const preset = PRESETS.find(p => isSameRange(presetRange(p.key, now), range));
  if (preset) return preset.label;
  if (range.from !== null && range.to !== null) {
    return `${formatStamp(range.from)} – ${formatStamp(range.to)}`;
  }
  return range.from !== null
    ? `From ${formatStamp(range.from)}`
    : `Until ${formatStamp(range.to as number)}`;
}

export function OrderDateFilter({
  value,
  onChange
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [now] = useState(() => Date.now());
  const active = value.from !== null || value.to !== null;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleFrom = (raw: string) => {
    const from = fromInputValue(raw);
    if (from === null) {
      onChange({...value, from: null});
      return;
    }
    onChange({from, to: value.to !== null && value.to < from ? from : value.to});
  };

  const handleTo = (raw: string) => {
    const to = fromInputValue(raw);
    if (to === null) {
      onChange({...value, to: null});
      return;
    }
    const inclusive = Math.min(to + 59999, endOfDay(to));
    onChange({
      from: value.from !== null && value.from > inclusive ? inclusive : value.from,
      to: inclusive
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={cn(
          'flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
          active
            ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
        )}
      >
        <CalendarDays size={16} />
        <span className="max-w-56 truncate">{rangeLabel(value, now)}</span>
        {active && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date filter"
            onClick={e => {
              e.stopPropagation();
              onChange({from: null, to: null});
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange({from: null, to: null});
              }
            }}
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full transition-colors',
              active ? 'hover:bg-white/20' : 'hover:bg-gray-100'
            )}
          >
            <X size={13} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-30 mt-1 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Quick range
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map(preset => {
              const selected = isSameRange(presetRange(preset.key, now), value);
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => onChange(presetRange(preset.key, now))}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                    selected
                      ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onChange({from: null, to: null})}
              className="col-span-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50"
            >
              Clear
            </button>
          </div>

          <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-gray-500">
            Custom range
          </p>
          <div className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-xs text-gray-500">From</span>
              <input
                type="datetime-local"
                value={value.from !== null ? toInputValue(value.from) : ''}
                onChange={e => handleFrom(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-500">
                To (inclusive)
              </span>
              <input
                type="datetime-local"
                value={value.to !== null ? toInputValue(value.to) : ''}
                onChange={e => handleTo(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 w-full rounded-xl bg-[#2d4a35] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[#3a5c44]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
