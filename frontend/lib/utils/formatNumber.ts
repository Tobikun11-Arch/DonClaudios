// One place for peso and count formatting so every screen shows thousand
// separators the same way (11,000 not 11000), whatever the browser locale.

const NUM = new Intl.NumberFormat('en-PH');
const PESO = new Intl.NumberFormat('en-PH', {maximumFractionDigits: 0});
const PESO_CENTS = new Intl.NumberFormat('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2});

const safe = (value: number) => (Number.isFinite(value) ? value : 0);

/** "₱11,000", or "₱11,000.00" with `cents`. */
export function formatPeso(value: number, cents = false): string {
  return `₱${(cents ? PESO_CENTS : PESO).format(safe(value))}`;
}

/** Peso amount without the sign, always two decimals: "11,000.00" (money inputs). */
export function formatMoney(value: number): string {
  return PESO_CENTS.format(safe(value));
}

/** Counts: "1,250". */
export function formatNumber(value: number): string {
  return NUM.format(safe(value));
}
