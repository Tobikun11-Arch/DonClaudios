'use client';

import Link from 'next/link';
import {AlertTriangle, ArrowRight, CheckCircle2} from 'lucide-react';
import type {DashboardValueSplit} from '@/lib/types/dashboard';

/**
 * The main dashboard's most important correction. Without this the revenue card
 * reads as "money in" when most of it is orders nobody ever closed, so the
 * banner spells out the split before anything else on the page.
 */
export function StuckOrdersAlert({
  split,
  isLoading
}: {
  split?: DashboardValueSplit;
  isLoading: boolean;
}) {
  if (isLoading) return null;
  if (!split) return null;

  const {stuckOrders, stuckValue, oldestStuckDays, staleAfterDays, collected, open} = split;
  const total = collected + open;
  const collectedShare = total > 0 ? Math.round((collected / total) * 100) : 100;

  if (stuckOrders === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#DCE8D3] bg-[#F7FAF3] px-4 py-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4A7C35]" />
        <p className="text-[0.85rem] text-[#1A1A1A]">
          Order queue is clean.{' '}
          <span className="text-[#6B7280]">
            Nothing has been open longer than {staleAfterDays} days, and{' '}
            {collectedShare}% of ordered value has been collected.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#EFC97A] bg-[#FDF8EC] px-4 py-3.5">
      <div className="flex flex-wrap items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.9rem] font-semibold text-[#1A1A1A]">
            {stuckOrders.toLocaleString()} orders worth ₱{stuckValue.toLocaleString()} are stuck
            {oldestStuckDays !== null && ` — the oldest has been waiting ${oldestStuckDays} days`}
          </p>
          <p className="mt-0.5 text-[0.8rem] text-[#6B7280]">
            These were placed but never completed or cancelled, so they sit in the open queue
            forever. They are excluded from revenue below, but they will keep inflating the order
            count until someone closes them.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem]">
            <span className="text-[#1A1A1A]">
              Collected{' '}
              <span className="font-semibold tabular-nums">₱{collected.toLocaleString()}</span>
              <span className="text-[#6B7280]"> ({collectedShare}%)</span>
            </span>
            <span className="text-[#1A1A1A]">
              Still open{' '}
              <span className="font-semibold tabular-nums">₱{open.toLocaleString()}</span>
              <span className="text-[#6B7280]">
                {' '}
                ({split.openOrders.toLocaleString()} orders)
              </span>
            </span>
            <Link
              href="/owner/dashboard?tab=orders"
              className="ml-auto flex items-center gap-1 font-semibold text-[#2d4a35] hover:underline"
            >
              Review open orders <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
