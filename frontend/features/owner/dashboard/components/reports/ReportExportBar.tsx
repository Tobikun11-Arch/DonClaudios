'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {Download, FileSpreadsheet, FileText, Loader2, Printer} from 'lucide-react';
import {cn} from '@/lib/utils';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {getReportPdf} from '@/lib/api/reportApi';
import {
  downloadCsv,
  exportFilename,
  toCsv,
  triggerBlobDownload
} from '@/lib/utils/csvExport';
import type {CsvColumn} from '@/lib/utils/csvExport';
import {rangeLabel} from './ReportRangePicker';
import type {ReportRange, ReportView} from '@/lib/types/report';

function buttonClass(disabled: boolean) {
  return cn(
    'flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors',
    disabled
      ? 'cursor-not-allowed border-gray-200 bg-white text-gray-300'
      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
  );
}

function Icon({view}: {view: ReportView}) {
  const cls = 'h-4 w-4 shrink-0';
  if (view === 'operations') return <Printer className={cls} />;
  if (view === 'products') return <FileSpreadsheet className={cls} />;
  return <FileText className={cls} />;
}

/**
 * The PDF is generated server-side. It has to be fetched with credentials via
 * `httpClient` (a plain `<a href>` would 401 against the separate API origin)
 * and then handed to the browser as a Blob.
 */
export function ReportExportBar({
  view,
  range,
  rows,
  columns
}: {
  view: ReportView;
  range: ReportRange;
  /** Rows to include in the CSV. Omit to disable CSV for this view. */
  rows?: Array<Record<string, string | number | null | undefined>>;
  columns?: ReadonlyArray<CsvColumn<Record<string, string | number | null | undefined>>>;
}) {
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);

  const canExportCsv = Boolean(rows && columns && rows.length > 0);

  const handlePdf = async () => {
    setBusy('pdf');
    try {
      const blob = await getReportPdf(view, range);
      triggerBlobDownload(blob, exportFilename(`don-claudios-${view}-report`, 'pdf'));
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(
        getFriendlyErrorMessage(error, 'Failed to generate the PDF report')
      );
    } finally {
      setBusy(null);
    }
  };

  const handleCsv = () => {
    if (!rows || !columns) return;
    setBusy('csv');
    try {
      downloadCsv(exportFilename(`don-claudios-${view}-report`, 'csv'), toCsv(rows, columns));
      toast.success(`${rows.length} row${rows.length === 1 ? '' : 's'} exported`);
    } catch {
      toast.error('Failed to build the CSV file');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handlePdf}
        disabled={busy !== null}
        className={buttonClass(busy !== null)}
        title={`Download the ${view} report as a PDF (${rangeLabel(range)})`}
      >
        {busy === 'pdf' ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <Icon view={view} />
        )}
        <span className="hidden sm:inline">PDF</span>
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className={buttonClass(false)}
        title="Print this view"
      >
        <Printer className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Print</span>
      </button>
    </div>
  );
}

export {Download};
