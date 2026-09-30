'use client';

import {useEffect, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Download, Loader2, X} from 'lucide-react';
import {toast} from 'sonner';
import {cn} from '@/lib/utils';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {getReportPdf} from '@/lib/api/reportApi';
import {listAllOrders} from '@/lib/api/orderApi';
import type {ListAllOrdersParams} from '@/lib/api/orderApi';
import {exportFilename, triggerBlobDownload} from '@/lib/utils/csvExport';
import type {ReportPreset, ReportRange} from '@/lib/types/report';
import {manilaToday} from '../../dashboard/components/reports/ReportRangePicker';
import {formatNumber, formatPeso} from '../../dashboard/components/reports/reportPrimitives';

function previewParams(range: ReportRange): ListAllOrdersParams {
  const params: ListAllOrdersParams = {page: 1, limit: 1, withCounts: true, preset: range.preset};
  if (range.preset === 'custom') {
    params.from = range.from;
    params.to = range.to;
  }
  return params;
}

function chipClass(active: boolean) {
  return cn(
    'rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
    active
      ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
  );
}

/**
 * The single "Download report" affordance for the orders page. The range
 * chosen here (today by default, so most downloads take one tap) is used only
 * for the report — it does not affect the orders table behind the modal.
 */
export function DownloadOrdersReport() {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<ReportPreset | 'custom'>('today');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);

  // Lock background scrolling while the modal is open (DOM side effects only).
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const customReady = from !== '' && to !== '' && from <= to;
  const ready = pick !== 'custom' || customReady;

  const downloadRange: ReportRange =
    pick === 'custom' ? {preset: 'custom', from: from || undefined, to: to || undefined} : {preset: pick};

  const preview = useQuery({
    queryKey: ['orders', 'download-preview', pick, from, to],
    queryFn: () => listAllOrders(previewParams(downloadRange)),
    enabled: open && ready,
    staleTime: 20_000,
    placeholderData: data => data
  });

  const revenue = preview.data?.revenue ?? 0;
  const previewTotal = preview.data?.total ?? 0;
  const previewLoading = preview.isPending;
  const noOrders = !previewLoading && previewTotal === 0;

  const selectPreset = (preset: ReportPreset) => {
    setPick(preset);
  };

  const updateFrom = (value: string) => {
    setFrom(value);
  };

  const updateTo = (value: string) => {
    setTo(value);
  };

  const handleDownload = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const blob = await getReportPdf('sales', downloadRange);
      triggerBlobDownload(blob, exportFilename('don-claudios-sales-report', 'pdf'));
      setOpen(false);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Failed to generate the PDF report'));
    } finally {
      setBusy(false);
    }
  };

  const today = manilaToday();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-full bg-[#2d4a35] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#233a29]"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>Download report</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Download orders report"
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1A1A1A]">
                Download orders report
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-2 mt-4 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
              Date range
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => selectPreset('today')}
                className={chipClass(pick === 'today')}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => selectPreset('yesterday')}
                className={chipClass(pick === 'yesterday')}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => selectPreset('7d')}
                className={chipClass(pick === '7d')}
              >
                Last 7 days
              </button>
              <button
                type="button"
                onClick={() => selectPreset('thisMonth')}
                className={chipClass(pick === 'thisMonth')}
              >
                This month
              </button>
              <button
                type="button"
                onClick={() => setPick('custom')}
                className={cn(chipClass(pick === 'custom'), 'col-span-2')}
              >
                Custom
              </button>
            </div>

            {pick === 'custom' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label>
                  <span className="mb-1 block text-[0.7rem] font-medium text-gray-500">
                    From
                  </span>
                  <input
                    type="date"
                    value={from}
                    max={to || today}
                    onChange={e => updateFrom(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-[0.7rem] font-medium text-gray-500">
                    To
                  </span>
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    max={today}
                    onChange={e => updateTo(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
                  />
                </label>
                {from !== '' && to !== '' && from > to && (
                  <p className="col-span-2 text-[0.72rem] font-medium text-red-500">
                    Start date must be on or before the end date.
                  </p>
                )}
              </div>
            )}

            <p className="mt-4 min-h-5 text-[0.8rem] text-[#6B7280]">
              {busy
                ? 'Generating PDF…'
                : previewLoading
                  ? 'Calculating…'
                  : noOrders
                    ? 'No orders in this range'
                    : `${formatNumber(previewTotal)} order${previewTotal === 1 ? '' : 's'} · ${formatPeso(
                        revenue,
                        revenue % 1 !== 0
                      )}`}
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!ready || busy || noOrders}
                className="flex items-center gap-1.5 rounded-full bg-[#2d4a35] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#233a29] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {busy ? 'Generating…' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}