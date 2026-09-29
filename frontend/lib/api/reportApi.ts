import {httpClient} from './httpClient';
import type {
  ReportBreakdown,
  ReportDimension,
  ReportInventoryHealth,
  ReportOperations,
  ReportRange,
  ReportSummary,
  ReportTimeseries,
  ReportView,
  ReportGranularity
} from '@/lib/types/report';

/** Axios drops `undefined` entries, so empty range fields never reach the API. */
function toParams(range: ReportRange) {
  if (range.preset === 'custom') {
    return {preset: 'custom', from: range.from, to: range.to};
  }
  return {preset: range.preset};
}

export async function getReportSummary(range: ReportRange) {
  const res = await httpClient.get<ReportSummary>('/report/summary', {params: toParams(range)});
  return res.data;
}

export async function getReportTimeseries(
  range: ReportRange,
  granularity?: ReportGranularity
) {
  const res = await httpClient.get<ReportTimeseries>('/report/timeseries', {
    params: {...toParams(range), ...(granularity ? {granularity} : {})}
  });
  return res.data;
}

export async function getReportBreakdown(
  range: ReportRange,
  dimension: ReportDimension,
  limit = 10
) {
  const res = await httpClient.get<ReportBreakdown>('/report/breakdown', {
    params: {...toParams(range), dimension, limit}
  });
  return res.data;
}

export async function getReportOperations(range: ReportRange) {
  const res = await httpClient.get<ReportOperations>('/report/operations', {params: toParams(range)});
  return res.data;
}

export async function getReportInventoryHealth(range: ReportRange) {
  const res = await httpClient.get<ReportInventoryHealth>('/report/inventory-health', {
    params: toParams(range)
  });
  return res.data;
}

/**
 * Fetches the server-rendered PDF as a Blob.
 *
 * This must go through `httpClient` rather than a plain anchor or `window.open`
 * so the access cookie is sent; a plain link would 401 because the token is
 * httpOnly and SameSite'd against a separate API origin.
 */
export async function getReportPdf(view: ReportView, range: ReportRange) {
  const res = await httpClient.get<Blob>('/report/pdf', {
    params: {...toParams(range), view},
    responseType: 'blob',
    timeout: 60_000
  });
  return res.data;
}
