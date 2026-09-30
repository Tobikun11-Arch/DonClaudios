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
        /*
          `flex-wrap` keeps this header honest on a phone. The title block only
          has `min-w-0`, while the actions - a segmented granularity control, a
          dimension toggle plus export button - keep their intrinsic width, so a
          nowrap row overflowed the card and was silently clipped by the global
          `overflow-x: hidden`. Wrapping lets the action drop to its own line,
          and `break-words` keeps a long subtitle such as "vs previous 7 days ·
          Sep 24 - Sep 30 · collected vs still open" wrapping inside the card
          rather than pushing it wider.
        */
        <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && (
              <h3 className="break-words text-[1rem] font-semibold text-[#1A1A1A]">{title}</h3>
            )}
            {subtitle && (
              <p className="break-words text-[0.8rem] leading-snug text-[#6B7280]">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Metrics where a rise is bad, so the delta must not be coloured as a win. */
const LOWER_IS_BETTER = new Set(['cancellationRate']);

export function ReportKpiTile({kpi}: {kpi: ReportKpi}) {
  const delta = formatDelta(kpi.delta);
  const change = kpi.delta ?? 0;
  const good = LOWER_IS_BETTER.has(kpi.key) ? change < 0 : change > 0;
  const deltaTone =
    change === 0 ? 'text-[#6B7280]' : good ? 'text-[#2D7A3A]' : 'text-red-500';
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 px-5 min-h-[104px] flex flex-col justify-between">
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
        {kpi.label}
      </p>
      <p className="text-[1.35rem] font-bold text-[#1A1A1A] leading-tight tabular-nums">
        {formatKpiValue(kpi)}
      </p>
      {delta ? (
        <p className={cn('text-[0.72rem] font-medium', deltaTone)}>
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

export function ReportKpiGrid({
  kpis,
  isLoading = false,
  skeletonCards
}: {
  kpis: ReportKpi[];
  isLoading?: boolean;
  skeletonCards?: readonly {key: string; label: string}[];
}) {
  if (isLoading) {
    return (
      <ReportStatGrid columns={4}>
        {(skeletonCards ?? []).map(card => (
          <ReportSkeletonTile key={card.key} label={card.label} />
        ))}
      </ReportStatGrid>
    );
  }
  return (
    <ReportStatGrid columns={4}>
      {kpis.map(kpi => (
        <ReportKpiTile key={kpi.key} kpi={kpi} />
      ))}
    </ReportStatGrid>
  );
}

/**
 * Picks KPIs by key while keeping the order of `cards`. Each tab owns a
 * distinct slice of the summary so no metric is headlineed twice.
 */
export function selectKpis(
  kpis: ReportKpi[],
  cards: readonly {key: string}[]
) {
  const byKey = new Map(kpis.map(kpi => [kpi.key, kpi]));
  return cards.flatMap(card => {
    const kpi = byKey.get(card.key);
    return kpi ? [kpi] : [];
  });
}

const GRID_COLS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5'
} as const;

export function ReportStatGrid({
  columns = 4,
  children
}: {
  columns?: keyof typeof GRID_COLS;
  children: ReactNode;
}) {
  return <div className={cn('grid grid-cols-1 gap-3', GRID_COLS[columns])}>{children}</div>;
}

export const SHIMMER = 'animate-pulse rounded bg-[#E8EDE6]';

/**
 * Placeholder shaped like a metric tile, so a loading grid occupies exactly the
 * same space as the loaded one and nothing jumps when the data lands.
 */
export function ReportSkeletonTile({label}: {label?: string}) {
  return (
    <div
      className={cn(
        CARD,
        'flex min-h-[104px] flex-col justify-between p-4 px-5'
      )}
      aria-hidden="true"
    >
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#B4BCB2]">
        {label ?? ''}
      </p>
      <div className={cn(SHIMMER, 'h-6 w-28')} />
      <div className={cn(SHIMMER, 'h-2.5 w-36')} />
    </div>
  );
}

/** Table-shaped placeholder used by every breakdown/stock list while fetching. */
export function ReportSkeletonRows({
  rows = 5,
  className
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3 px-5 pb-5', className)} aria-hidden="true">
      {Array.from({length: rows}).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <div
            className={cn(SHIMMER, 'h-3 flex-1')}
            style={{maxWidth: `${70 - index * 6}%`}}
          />
          <div className={cn(SHIMMER, 'h-3 w-14')} />
          <div className={cn(SHIMMER, 'h-3 w-20')} />
        </div>
      ))}
    </div>
  );
}

/**
 * Metric tile for values the summary KPI list does not carry (live kitchen
 * counts, inventory health, customer mix). Mirrors `ReportKpiTile`'s shell so
 * every tab reads as one grid.
 */
export function ReportStatTile({
  label,
  value,
  hint,
  tone = 'default',
  valueClassName,
  isLoading = false,
  skeletonWidth = 'w-28'
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'warning' | 'danger';
  valueClassName?: string;
  isLoading?: boolean;
  skeletonWidth?: string;
}) {
  const valueTone =
    tone === 'danger' ? 'text-red-500' : tone === 'warning' ? 'text-[#B45309]' : 'text-[#1A1A1A]';
  return (
    <div
      className={cn(
        CARD,
        'flex min-h-[104px] flex-col justify-between p-4 px-5',
        tone === 'warning' && 'border-[#F0D9A8] bg-[#FDF8EE]',
        tone === 'danger' && 'border-red-200 bg-red-50'
      )}
    >
      <p
        className={cn(
          'text-[0.7rem] font-medium uppercase tracking-[0.08em]',
          isLoading ? 'text-[#B4BCB2]' : 'text-[#6B7280]'
        )}
      >
        {label}
      </p>
      {isLoading ? (
        <div className={cn(SHIMMER, 'h-6', skeletonWidth)} aria-hidden="true" />
      ) : (
        <p
          className={cn(
            'text-[1.35rem] font-bold leading-tight tabular-nums',
            valueTone,
            valueClassName
          )}
        >
          {value}
        </p>
      )}
      {isLoading ? (
        <div className={cn(SHIMMER, 'h-2.5 w-36')} aria-hidden="true" />
      ) : hint ? (
        <p className="text-[0.72rem] leading-snug text-[#6B7280]">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Shared loading/empty/error body so every panel looks and behaves the same.
 * While loading it reserves the panel's final height with a shimmer, so the
 * card does not collapse and re-expand as data arrives.
 */
export function ReportBody({
  isLoading,
  isError,
  isEmpty,
  emptyMessage = 'No data for this period',
  height = 120,
  skeleton = 'block',
  children
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  height?: number;
  skeleton?: 'block' | 'rows';
  children: ReactNode;
}) {
  if (isLoading) {
    if (skeleton === 'rows') return <ReportSkeletonRows rows={5} />;
    return (
      <div className="px-2 pb-4" style={{height}} aria-hidden="true">
        <div className={cn(SHIMMER, 'h-full w-full rounded-lg')} />
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
