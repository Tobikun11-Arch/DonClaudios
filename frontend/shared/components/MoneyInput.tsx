'use client';

import {useLayoutEffect, useRef, useState, type ChangeEvent, type ComponentProps, type FocusEvent} from 'react';
import {Input} from '@/components/ui/input';
import {formatMoney, formatNumber} from '@/lib/utils/formatNumber';

type Props = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'inputMode' | 'min' | 'max' | 'ref'
> & {
  /** Plain number (or numeric string from string-state forms). Empty = null/''. */
  value: number | string | null | undefined;
  /** Always a plain number, or null when cleared. Never the formatted text. */
  onValueChange: (value: number | null) => void;
  /** false for fields the API takes as whole pesos: "." is ignored, ".00" still shows. */
  allowCents?: boolean;
  /** Most digits before the decimal point. */
  maxDigits?: number;
  min?: number;
  max?: number;
  /** Raw <input> (caller's own classes) instead of the shadcn Input. */
  plain?: boolean;
};

/** "₱1,000" / "1000.00" / "1,234.5" -> 1234.5; empty or junk -> null. */
function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = value.replace(/[^0-9.]/g, '');
  if (s === '' || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const show = (n: number | null) => (n == null ? '' : formatMoney(n));

/**
 * Peso amount input: types as 1,000 / 1,234.5 (commas live, max 2 decimals)
 * and pads to 1,000.00 on blur. The parent only ever sees numbers.
 */
export function MoneyInput({
  value,
  onValueChange,
  allowCents = true,
  maxDigits = 9,
  min,
  max,
  plain,
  onBlur,
  ...rest
}: Props) {
  const num = toNumber(value);
  const ref = useRef<HTMLInputElement>(null);
  // caret = how many digits/dots sit before the cursor, restored after commas move.
  const [state, setState] = useState<{text: string; caret: number | null}>(() => ({text: show(num), caret: null}));
  const [prevNum, setPrevNum] = useState(num);
  if (num !== prevNum) {
    setPrevNum(num);
    // Value changed from outside (reset, quick-cash button): show it padded.
    if (num !== toNumber(state.text)) setState({text: show(num), caret: null});
  }

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || state.caret == null || document.activeElement !== el) return;
    let pos = 0;
    for (let seen = 0; pos < state.text.length && seen < state.caret; pos++) {
      if (state.text[pos] !== ',') seen++;
    }
    el.setSelectionRange(pos, pos);
  }, [state]);

  // Keeps the old type="number" min/max checks (enterNavigation, form validity).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let msg = '';
    if (num != null && min != null && num < min) msg = `Enter at least ${formatMoney(min)}`;
    else if (num != null && max != null && num > max) msg = `Enter at most ${formatMoney(max)}`;
    el.setCustomValidity(msg);
  }, [num, min, max]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const caret = (raw.slice(0, e.target.selectionStart ?? raw.length).match(/[0-9.]/g) ?? []).length;
    const s = raw.replace(/[^0-9.]/g, '');
    const dot = s.indexOf('.');
    let int = (dot < 0 ? s : s.slice(0, dot)).replace(/^0+(?=\d)/, '').slice(0, maxDigits);
    const dec = dot < 0 || !allowCents ? null : s.slice(dot + 1).replace(/\./g, '').slice(0, 2);
    if (dec !== null && int === '') int = '0';
    const text = (int === '' ? '' : formatNumber(Number(int))) + (dec === null ? '' : `.${dec}`);
    setState({text, caret});
    onValueChange(toNumber(text));
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setState(st => ({text: show(toNumber(st.text)), caret: null}));
    onBlur?.(e);
  };

  const Tag = plain ? 'input' : Input;
  return (
    <Tag
      {...rest}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={state.text}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
