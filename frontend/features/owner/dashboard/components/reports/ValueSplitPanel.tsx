'use client';

import {AlertTriangle, CheckCircle2} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
  formatNumber,
  formatPeso,
  ReportSkeletonRows,
  SHIMMER
} from './reportPrimitives';
import type {ReportSummary} from '@/lib/types/report';

type Row = {
  key: string;
  label: string;
  value: number;
  orders: number;
  detail: string;
  tone: 'good' | 'warn' | 'neutral';
  indent?: boolean;
};

/**
 * Shows the three buckets of order value side by side. Without this the owner
 * sees one "revenue" number and cannot tell how much of it was actually paid
 * for, which is the difference between a healthy day and a queue of orders
 * nobody ever closed.
 */
export function ValueSplitPanel({summary}: {summary?: ReportSummary}) {
  // The card frame is already rendered by the caller, so hold the same space
  // with a shimmer instead of collapsing to nothing while the fetch is in flight.
  if (!summary) {
    return (
      <div className="px-5 pb-5" aria-hidden="true">
        <div className="mb-3 overflow-hidden rounded-lg border border-[#E4E9E1]">
          <ReportSkeletonRows rows={3} className="!px-3.5 !pb-3.5" />
        </div>
        <div className={cn(SHIMMER, 'h-2.5 w-full')} />
        <div className={cn(SHIMMER, 'mt-3 h-3 w-2/3')} />
      </div>
    );
  }
  const split = summary.valueSplit;
  const total = split.collected + split.open;
  const realizedShare = total > 0 ? (split.collected / total) * 100 : 0;

  const rows: Row[] = [
    {
      key: 'collected',
      label: 'Collected',
      value: split.collected,
      orders: split.collectedOrders,
      detail: 'Completed and paid for',
      tone: 'good'
    },
    {
      key: 'open',
      label: 'Still open',
      value: split.open,
      orders: split.openOrders,
      detail: 'Placed, not yet fulfilled',
      tone: split.open > 0 ? 'warn' : 'neutral'
    },
    {
      key: 'stale',
      label: `Stuck ${split.staleAfterDays}d+`,
      value: split.stale,
      orders: split.staleOrders,
      detail:
        split.oldestOpenDays !== null
          ? `Oldest has waited ${formatNumber(split.oldestOpenDays)} days`
          : 'Part of "Still open" above',
      tone: split.stale > 0 ? 'warn' : 'neutral',
      indent: true
    }
  ];

  return (
    <div className="px-5 pb-5">
      <div className="overflow-hidden rounded-lg border border-[#E4E9E1]">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className={`flex items-center gap-3 px-3.5 py-2.5 ${
              index > 0 ? 'border-t border-[#EDF1EA]' : ''
            } ${row.indent ? 'bg-[#FCFDFB]' : ''}`}
          >
            {row.tone === 'good' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4A7C35]" />
            ) : row.tone === 'warn' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#B45309]" />
            ) : (
              <span className="h-4 w-4 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[0.85rem] font-semibold text-[#1A1A1A]">
                {row.label}
                {row.indent && <span className="ml-1.5 font-normal text-[#6B7280]">(of open)</span>}
              </p>
              <p className="truncate text-[0.72rem] text-[#6B7280]">{row.detail}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="tabular-nums text-[0.9rem] font-bold text-[#1A1A1A]">
                {formatPeso(row.value)}
              </p>
              <p className="tabular-nums text-[0.7rem] text-[#6B7280]">
                {formatNumber(row.orders)} orders
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[0.75rem]">
          <span className="text-[#6B7280]">Collected share of ordered value</span>
          <span className="font-semibold tabular-nums text-[#1A1A1A]">
            {formatNumber(Math.round(realizedShare))}%
          </span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#F3F6F1]">
          <div
            className="h-full bg-[#4A7C35]"
            style={{width: `${realizedShare}%`}}
            title="Collected"
          />
          <div
            className="h-full bg-[#E0A62B]"
            style={{width: `${100 - realizedShare}%`}}
            title="Still open"
          />
        </div>
      </div>

      <p className="mt-3 text-[0.72rem] leading-relaxed text-[#6B7280]">
        Cancelled orders are excluded. Revenue is reported as collected revenue only, because
        nothing in the order flow closes an abandoned order automatically — a stuck order stays
        in the queue and would otherwise be reported as sales.
      </p>
    </div>
  );
}
