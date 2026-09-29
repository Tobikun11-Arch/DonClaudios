'use client';

import {useQuery} from '@tanstack/react-query';
import {
  getReportBreakdown,
  getReportInventoryHealth,
  getReportOperations,
  getReportSummary,
  getReportTimeseries
} from '@/lib/api/reportApi';
import type {
  ReportDimension,
  ReportGranularity,
  ReportRange
} from '@/lib/types/report';

/**
 * The range is part of every key. The existing `useDashboardSummaryQuery` omits
 * its `days` argument, which would serve a stale window when the owner switches
 * ranges — so report keys always carry the serialised range.
 */
const rangeKey = (range: ReportRange) => [
  range.preset,
  range.from ?? null,
  range.to ?? null
] as const;

export const reportKeys = {
  summary: (r: ReportRange) => ['report', 'summary', ...rangeKey(r)] as const,
  timeseries: (r: ReportRange, g?: ReportGranularity) =>
    ['report', 'timeseries', ...rangeKey(r), g ?? null] as const,
  breakdown: (r: ReportRange, dimension: ReportDimension, limit: number) =>
    ['report', 'breakdown', ...rangeKey(r), dimension, limit] as const,
  operations: (r: ReportRange) => ['report', 'operations', ...rangeKey(r)] as const,
  inventoryHealth: (r: ReportRange) => ['report', 'inventory-health', ...rangeKey(r)] as const
};

const shared = {
  refetchOnWindowFocus: false,
  staleTime: 60_000,
  gcTime: 30 * 60 * 1000
} as const;

export function useReportSummaryQuery(range: ReportRange, enabled = true) {
  return useQuery({
    queryKey: reportKeys.summary(range),
    queryFn: () => getReportSummary(range),
    enabled,
    ...shared
  });
}

export function useReportTimeseriesQuery(
  range: ReportRange,
  granularity?: ReportGranularity,
  enabled = true
) {
  return useQuery({
    queryKey: reportKeys.timeseries(range, granularity),
    queryFn: () => getReportTimeseries(range, granularity),
    enabled,
    ...shared
  });
}

export function useReportBreakdownQuery(
  range: ReportRange,
  dimension: ReportDimension,
  limit = 10,
  enabled = true
) {
  return useQuery({
    queryKey: reportKeys.breakdown(range, dimension, limit),
    queryFn: () => getReportBreakdown(range, dimension, limit),
    enabled,
    ...shared
  });
}

export function useReportOperationsQuery(range: ReportRange, enabled = true) {
  return useQuery({
    queryKey: reportKeys.operations(range),
    queryFn: () => getReportOperations(range),
    enabled,
    ...shared
  });
}

export function useReportInventoryHealthQuery(range: ReportRange, enabled = true) {
  return useQuery({
    queryKey: reportKeys.inventoryHealth(range),
    queryFn: () => getReportInventoryHealth(range),
    enabled,
    ...shared
  });
}
