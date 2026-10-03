const POINTS = new Intl.NumberFormat('en-PH', {
  maximumFractionDigits: 0
});

/**
 * Formats a point amount with thousands separators so balances stay readable
 * at the new scale (e.g. 5000 -> "5,000").
 */
export function formatPoints(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return POINTS.format(value);
}