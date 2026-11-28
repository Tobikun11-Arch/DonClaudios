/*
 * Pre-order size labels ("4-5 KG", "4.5kg", "500 g - 1 kg", "8 kg up") and
 * the duplicate / overlap rule for sizes of one product on a date.
 * Keep in sync with frontend/lib/preOrder/sizeOverlap.ts.
 *
 * Rules:
 * - A label with a weight is read as a range in grams. A single weight is a
 *   point (4.5 kg = 4500..4500). "8 kg up" / "8kg+" is open-ended.
 * - Two ranges overlap when they share more than an endpoint: 4-5 vs 4.5-6
 *   overlap, 4-5 vs 5-6 do not (that is how weight brackets are written).
 * - A single weight is covered by a range including its ends: 4.5 and 5 are
 *   both covered by 4-5. Two equal weights are duplicates.
 * - A label without a weight falls back to an exact match that ignores case
 *   and spaces ("Whole Lechon" = "whole  lechon").
 */

export type SizeRange = {min: number; max: number};

const UNIT = '(kilograms?|kilos?|kgs?|grams?|gms?|g)(?![a-z])';
const NUM = '(\\d+(?:\\.\\d+)?)';
const RANGE_RE = new RegExp(`(?<![\\d.])${NUM}\\s*(?:${UNIT})?\\s*(?:-|to)\\s*${NUM}\\s*${UNIT}`);
const SINGLE_RE = new RegExp(`(?<![\\d.])${NUM}\\s*${UNIT}(\\s*(?:\\+|(?:and\\s*|&\\s*)?up\\b|(?:and\\s*)?above\\b))?`);

const grams = (n: string, unit: string) => Math.round(Number(n) * (unit.startsWith('k') ? 1000 : 1));

/** Weight range in grams, or null when the label has no weight. */
export function parseSizeWeight(label: string): SizeRange | null {
  const s = label.toLowerCase().replace(/[‐-―−~]/g, '-');
  const r = RANGE_RE.exec(s);
  if (r) {
    const a = grams(r[1], r[2] ?? r[4]);
    const b = grams(r[3], r[4]);
    return {min: Math.min(a, b), max: Math.max(a, b)};
  }
  const one = SINGLE_RE.exec(s);
  if (!one) return null;
  const w = grams(one[1], one[2]);
  return {min: w, max: one[3] ? Infinity : w};
}

const textKey = (label: string) => label.toLowerCase().replace(/\s+/g, '');

function rangesOverlap(a: SizeRange, b: SizeRange): boolean {
  if (a.min > b.max || b.min > a.max) return false;
  // Two real ranges that only touch (4-5 and 5-6) are fine.
  const touching = a.max === b.min || b.max === a.min;
  return !(touching && a.min < a.max && b.min < b.max);
}

/** True when the two labels name the same size or overlapping weights. */
export function sizesConflict(a: string, b: string): boolean {
  const ra = parseSizeWeight(a);
  const rb = parseSizeWeight(b);
  if (ra && rb) return rangesOverlap(ra, rb);
  if (ra || rb) return false;
  return textKey(a) === textKey(b);
}

export type SizeConflict = {index: number; otherIndex: number};

/**
 * For each size that clashes with an earlier one, the earlier one's index.
 * `locked(i)` marks sizes that cannot be changed (already ordered, label
 * unchanged); a clash between two locked sizes is let through so old data
 * stays saveable.
 */
export function findSizeConflicts(labels: string[], locked: (i: number) => boolean = () => false): SizeConflict[] {
  const out: SizeConflict[] = [];
  for (let i = 1; i < labels.length; i++) {
    if (!labels[i].trim()) continue;
    for (let j = 0; j < i; j++) {
      if (!labels[j].trim() || (locked(i) && locked(j))) continue;
      if (sizesConflict(labels[i], labels[j])) {
        out.push({index: i, otherIndex: j});
        break;
      }
    }
  }
  return out;
}
