/**
 * Client-side CSV export. Kept dependency-free and deliberately small: values
 * are quoted and internal quotes doubled so a product name containing a comma
 * or a quote cannot corrupt the row.
 */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(raw: string | number | null | undefined) {
  if (raw === null || raw === undefined) return '';
  const text = String(raw);
  // Prefix formula characters so a spreadsheet never evaluates them as code.
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function toCsv<T>(rows: T[], columns: ReadonlyArray<CsvColumn<T>>): string {
  const header = columns.map(c => escapeCell(c.header)).join(',');
  const body = rows.map(row => columns.map(c => escapeCell(c.value(row))).join(','));
  return [header, ...body].join('\r\n');
}

export function downloadCsv(filename: string, csv: string) {
  // The BOM keeps Excel from mangling the peso sign and accented names.
  const blob = new Blob([`\uFEFF${csv}`], {type: 'text/csv;charset=utf-8;'});
  triggerBlobDownload(blob, filename);
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on the next tick; revoking synchronously can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `sales-2026-09-30` style suffix, using Manila so it matches the report window. */
export function exportFilename(prefix: string, extension: string) {
  const stamp = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
    .format(new Date())
    .replace(/-/g, '');
  return `${prefix}-${stamp}.${extension}`;
}
