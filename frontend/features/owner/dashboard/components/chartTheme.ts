'use client';

import {useEffect, useState} from 'react';
import {useTheme} from 'next-themes';
import type {CSSProperties} from 'react';

/**
 * Colours for the owner charts (recharts takes colours as props, so Tailwind
 * `dark:` classes cannot reach them).
 *
 * LIGHT values are exactly what the charts used before dark mode existed, so
 * light mode renders identically. DARK values keep lines, labels and tooltips
 * readable on the dark cards.
 */
const LIGHT = {
  grid: '#E5E7EB',
  tick: '#6B7280',
  areaFill: '#E8F0E3',
  line: '#4A7C35',
  lineStrong: '#2D4A1E',
  bar: '#4A7C35',
  barPeak: '#2D4A1E',
  barMuted: '#7BAF5A',
  tooltip: {borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12} as CSSProperties
};

const DARK: typeof LIGHT = {
  grid: '#374151',
  tick: '#9CA3AF',
  areaFill: '#1f3a2a',
  line: '#7ed4a0',
  lineStrong: '#7ed4a0',
  bar: '#5fae7c',
  barPeak: '#7ed4a0',
  barMuted: '#3f7a52',
  tooltip: {
    borderRadius: 8,
    border: '1px solid #374151',
    fontSize: 12,
    backgroundColor: '#111827',
    color: '#F3F4F6'
  }
};

export type ChartColors = typeof LIGHT;

export function useChartColors(): ChartColors {
  const {resolvedTheme} = useTheme();
  // Before mount the theme is unknown on the server: render light (the
  // default) to avoid a hydration mismatch, then switch if needed.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  return mounted && resolvedTheme === 'dark' ? DARK : LIGHT;
}
