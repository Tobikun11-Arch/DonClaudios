// Thousand-separated numbers for user-facing text (11,000 not 11000).

const safe = (value: number) => (Number.isFinite(value) ? value : 0);

/** "1,250", or a fixed number of decimals ("1,250.00" with 2). */
export function formatNumber(value: number, decimals?: number): string {
  return safe(value).toLocaleString(
    'en-PH',
    decimals === undefined ? undefined : {minimumFractionDigits: decimals, maximumFractionDigits: decimals}
  );
}

/** "₱11,000.00". Not for PDFs: pdfkit's built-in fonts cannot draw the peso sign. */
export function formatPeso(value: number): string {
  return `₱${formatNumber(value, 2)}`;
}
