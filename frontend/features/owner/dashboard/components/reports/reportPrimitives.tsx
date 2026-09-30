'use client';

import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';
import type {ReportKpi} from '@/lib/types/report';

const PESO = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const PESO_CENTS = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const NUM = new Intl.NumberFormat('en-PH');

export function formatPeso(value: number, cents = false) {
  return `₱${(cents ? PESO_CENTS : PESO).format(value)}`;
}

export function formatCompactPeso(value: number) {
  if (Math.abs(value) >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `₱${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return `₱${PESO.format(value)}`;
}

export function formatNumber(value: number) {
  return NUM.format(value);
}

/** Applies the KPI's own `format` so a percent never renders without its sign. */
export function formatKpiValue(kpi: ReportKpi) {
  switch (kpi.format) {
    case 'peso':
      return formatPeso(kpi.value, kpi.value % 1 !== 0);
    case 'percent':
      return `${NUM.format(Math.round(kpi.value * 10) / 10)}%`;
    case 'minutes':
      return `${Math.round(kpi.value)} min`;
    default:
      return formatNumber(kpi.value);
  }
}

export function formatDelta(delta?: number | null) {
  if (delta === null || delta === undefined) return null;
  if (delta === 0) return 'No change';
  return `${delta > 0 ? '+' : ''}${NUM.format(Math.round(delta * 10) / 10)}%`;
}

export function formatBucketLabel(bucket: string, granularity: string) {
  const iso = bucket.length === 7 ? `${bucket}-01` : bucket;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return bucket;
  if (granularity === 'month') return d.toLocaleDateString('en-US', {month: 'short', year: '2-digit'});
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

export function formatHour(hour: number) {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${suffix}`;
}

export function titleCaseStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const CARD = 'bg-white border border-[#E5E7EB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]';

export function ReportCard({
  title,
  subtitle,
  action,
  children,
  className
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(CARD, className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && <h3 className="text-[1rem] font-semibold text-[#1A1A1A]">{title}</h3>}
            {subtitle && <p className="text-[0.8rem] text-[#6B7280]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function ReportKpiTile({kpi}: {kpi: ReportKpi}) {
  const delta = formatDelta(kpi.delta);
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 px-5 min-h-[104px] flex flex-col justify-between">
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
        {kpi.label}
      </p>
      <p className="text-[1.35rem] font-bold text-[#1A1A1A] leading-tight tabular-nums">
        {formatKpiValue(kpi)}
      </p>
      {delta ? (
        <p
          className={cn(
            'text-[0.72rem] font-medium',
            (kpi.delta ?? 0) > 0
              ? 'text-[#2D7A3A]'
              : (kpi.delta ?? 0) < 0
                ? 'text-red-500'
                : 'text-[#6B7280]'
          )}
        >
          {delta}
          {kpi.hint ? <span className="font-normal text-[#6B7280]"> · {kpi.hint}</span> : null}
        </p>
      ) : kpi.hint ? (
        <p className="text-[0.72rem] text-[#6B7280]">{kpi.hint}</p>
      ) : (
        <p className="text-[0.72rem] text-[#6B7280]">No comparison period</p>
      )}
    </div>
  );
}

export function ReportKpiGrid({kpis, columns = 4}: {kpis: ReportKpi[]; columns?: number}) {
  const cols =
    columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';
  return (
    <div className={cn('grid grid-cols-1 gap-3', cols)}>
      {kpis.map(kpi => (
        <ReportKpiTile key={kpi.key} kpi={kpi} />
      ))}
    </div>
  );
}

/** Shared loading/empty/error body so every panel looks and behaves the same. */
export function ReportBody({
  isLoading,
  isError,
  isEmpty,
  emptyMessage = 'No data for this period',
  height = 120,
  children
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  height?: number;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[#6B7280]"
        style={{height}}
      >
        Loading…
      </div>
    );
  }
  if (isError) {
    return (
      <div
        className="flex items-center justify-center text-sm text-red-500"
        style={{height}}
      >
        Failed to load data
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[#6B7280]"
        style={{height}}
      >
        {emptyMessage}
      </div>
    );
  }
  return <>{children}</>;
}

/** Progress bar used for shares, hourly load and status funnels. */
export function ShareBar({share, color = '#4A7C35'}: {share: number; color?: string}) {
  const width = Math.max(0, Math.min(100, share));
  return (
    <div className="h-1.5 w-full rounded-full bg-[#E8F0E3] overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{width: `${width}%`, backgroundColor: color}}
      />
    </div>
  );
}

export function ReportNote({children}: {children: ReactNode}) {
  return (
    <p className="px-5 pb-4 text-[0.72rem] leading-relaxed text-[#6B7280] border-t border-[#E5E7EB] pt-3">
      {children}
    </p>
  );
}
