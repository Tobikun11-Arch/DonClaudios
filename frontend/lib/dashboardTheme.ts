import type {CSSProperties} from 'react';
import type {DashboardTheme} from '@/lib/types/settings';

/** Built-in DonClaudio's green, used when the owner hasn't picked colors. */
export const DEFAULT_DASHBOARD_THEME = {
  sidebarBg: '#2d4a35',
  accent: '#4a7c59'
} as const;

export const DASHBOARD_THEME_PRESETS: {name: string; sidebarBg: string; accent: string}[] = [
  {name: "DonClaudio's Green", sidebarBg: '', accent: ''},
  {name: 'Lechon Maroon', sidebarBg: '#4a1c1c', accent: '#a5432f'},
  {name: 'Midnight Navy', sidebarBg: '#1e2a44', accent: '#3d63c9'},
  {name: 'Roast Brown', sidebarBg: '#3f2c20', accent: '#a8743a'},
  {name: 'Charcoal', sidebarBg: '#1f2328', accent: '#d08b2c'},
  {name: 'Light Cream', sidebarBg: '#f6f1e7', accent: '#2d4a35'}
];

export const isHexColor = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

type RGB = [number, number, number];

function toRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB) {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

/** `amount` of `a` blended over `b`. */
function mix(a: string, b: string, amount: number) {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex(ca.map((c, i) => c * amount + cb[i] * (1 - amount)) as RGB);
}

function luminance(hex: string) {
  const [r, g, b] = toRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1 to 21). */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = '#ffffff';
const INK = '#111827';

/** White or near-black, whichever reads better on `bg`. */
export function readableTextOn(bg: string) {
  return contrastRatio(WHITE, bg) >= contrastRatio(INK, bg) ? WHITE : INK;
}

export interface DashboardPalette {
  sidebar: string;
  hover: string;
  text: string;
  textDim: string;
  textStrong: string;
  accent: string;
  accentText: string;
  highlight: string;
  danger: string;
  dangerHover: string;
  dangerHoverBg: string;
}

// The exact hand-tuned colors the dashboards shipped with.
const DEFAULT_PALETTE: DashboardPalette = {
  sidebar: '#2d4a35',
  hover: '#3a5c44',
  text: '#b8d4c0',
  textDim: '#7aab8a',
  textStrong: WHITE,
  accent: '#4a7c59',
  accentText: WHITE,
  highlight: '#7ed4a0',
  danger: '#f08080',
  dangerHover: '#fca5a5',
  dangerHoverBg: '#3a1a1a'
};

/**
 * Every sidebar color, derived from the owner's two picks. Text colors are
 * chosen automatically so menus stay readable on any background.
 */
export function dashboardPalette(theme?: Partial<DashboardTheme>): DashboardPalette {
  const sidebarBg = theme?.sidebarBg && isHexColor(theme.sidebarBg) ? theme.sidebarBg : '';
  const accentPick = theme?.accent && isHexColor(theme.accent) ? theme.accent : '';
  if (!sidebarBg && !accentPick) return DEFAULT_PALETTE;

  const sidebar = sidebarBg || DEFAULT_DASHBOARD_THEME.sidebarBg;
  const accent = accentPick || DEFAULT_DASHBOARD_THEME.accent;
  const strong = readableTextOn(sidebar);
  const darkSidebar = strong === WHITE;

  return {
    sidebar,
    hover: mix(strong, sidebar, 0.1),
    text: mix(strong, sidebar, 0.8),
    textDim: mix(strong, sidebar, 0.6),
    textStrong: strong,
    accent,
    accentText: readableTextOn(accent),
    // Mobile nav active color: the accent when it stands out on the sidebar.
    highlight: contrastRatio(accent, sidebar) >= 3 ? accent : strong,
    danger: darkSidebar ? '#f08080' : '#dc2626',
    dangerHover: darkSidebar ? '#fca5a5' : '#b91c1c',
    dangerHoverBg: darkSidebar ? mix('#ff0000', sidebar, 0.15) : '#fee2e2'
  };
}

/** CSS variables used by the dashboard layouts (`var(--dash-*)`). */
export function dashboardThemeStyle(theme?: Partial<DashboardTheme>): CSSProperties {
  const p = dashboardPalette(theme);
  return {
    '--dash-sidebar': p.sidebar,
    '--dash-hover': p.hover,
    '--dash-text': p.text,
    '--dash-text-dim': p.textDim,
    '--dash-text-strong': p.textStrong,
    '--dash-accent': p.accent,
    '--dash-accent-text': p.accentText,
    '--dash-highlight': p.highlight,
    '--dash-danger': p.danger,
    '--dash-danger-hover': p.dangerHover,
    '--dash-danger-hover-bg': p.dangerHoverBg
  } as CSSProperties;
}
