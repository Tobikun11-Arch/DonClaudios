'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {Check, LayoutDashboard, LogOut, Package, Settings} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useSettingsQuery, useUpdateDashboardThemeMutation} from '@/lib/hooks/useSettings';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  DASHBOARD_THEME_PRESETS,
  DEFAULT_DASHBOARD_THEME,
  contrastRatio,
  dashboardPalette,
  dashboardThemeStyle,
  isHexColor
} from '@/lib/dashboardTheme';
import type {DashboardTheme} from '@/lib/types/settings';

const EMPTY: DashboardTheme = {sidebarBg: '', accent: ''};

const same = (a: DashboardTheme, b: DashboardTheme) =>
  a.sidebarBg.toLowerCase() === b.sidebarBg.toLowerCase() &&
  a.accent.toLowerCase() === b.accent.toLowerCase();

/** Owner-picked sidebar and accent colors for the owner and cashier dashboards. */
export function DashboardColorsCard() {
  const settingsQuery = useSettingsQuery();
  const saved = settingsQuery.data?.dashboardTheme ?? EMPTY;
  const mutation = useUpdateDashboardThemeMutation();

  const [draft, setDraft] = useState<DashboardTheme>(saved);
  // Follow the saved value when it changes (first load, save, other tab).
  const [prevSaved, setPrevSaved] = useState(saved);
  if (!same(prevSaved, saved)) {
    setPrevSaved(saved);
    setDraft(saved);
  }

  const palette = dashboardPalette(draft);
  const dirty = !same(draft, saved);
  const lowContrast = contrastRatio(palette.accent, palette.sidebar) < 1.5;
  const invalid =
    (draft.sidebarBg !== '' && !isHexColor(draft.sidebarBg)) ||
    (draft.accent !== '' && !isHexColor(draft.accent));

  const save = (theme: DashboardTheme, message: string) => {
    mutation.mutate(theme, {
      onSuccess: () => toast.success(message),
      onError: err => toast.error(getFriendlyErrorMessage(err, 'Failed to save colors'))
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Dashboard colors
      </div>
      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        Brand the owner and cashier dashboards. Menu text color is picked
        automatically so it stays readable.
      </div>

      {/* Presets */}
      <div className="mt-4 flex flex-wrap gap-2">
        {DASHBOARD_THEME_PRESETS.map(preset => {
          const p = dashboardPalette(preset);
          const active = same(draft, preset);
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => setDraft({sidebarBg: preset.sidebarBg, accent: preset.accent})}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-[#2d4a35] bg-[#e9f5ee] text-[#2d4a35] dark:border-[#7ed4a0] dark:bg-[#1f3a2a] dark:text-[#7ed4a0]'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
            >
              <span
                className="relative h-4 w-4 overflow-hidden rounded-full border border-black/10"
                style={{background: p.sidebar}}
              >
                <span
                  className="absolute bottom-0 right-0 h-2 w-2 rounded-tl-full"
                  style={{background: p.accent}}
                />
              </span>
              {preset.name}
              {active && <Check className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[1fr_auto]">
        {/* Pickers */}
        <div className="space-y-4">
          <ColorField
            label="Sidebar background"
            hint="The menu bar on the left (bottom bar on phones)."
            value={draft.sidebarBg}
            fallback={DEFAULT_DASHBOARD_THEME.sidebarBg}
            onChange={v => setDraft(d => ({...d, sidebarBg: v}))}
          />
          <ColorField
            label="Accent"
            hint="Highlights the page you're on."
            value={draft.accent}
            fallback={DEFAULT_DASHBOARD_THEME.accent}
            onChange={v => setDraft(d => ({...d, accent: v}))}
          />
          {lowContrast && !invalid && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              The accent is very close to the sidebar color, so the current page
              will be hard to spot. Try a lighter or darker accent.
            </p>
          )}
        </div>

        {/* Live preview, styled with the same variables as the real sidebar */}
        <div>
          <div className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            Preview
          </div>
          <div
            style={dashboardThemeStyle(draft)}
            className="w-full md:w-52 rounded-2xl bg-(--dash-sidebar) p-3 shadow-lg"
            aria-hidden
          >
            <div className="mb-3 flex items-center gap-2 border-b border-(--dash-hover) pb-3">
              <span className="h-7 w-7 rounded-full bg-(--dash-accent)" />
              <span className="text-xs font-bold text-(--dash-text-strong)">Your Store</span>
            </div>
            <div className="space-y-1">
              <PreviewItem icon={LayoutDashboard} label="Dashboard" active />
              <PreviewItem icon={Package} label="Products" />
              <PreviewItem icon={Settings} label="Settings" />
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-(--dash-hover) px-2 pt-3 text-xs font-semibold text-(--dash-danger)">
              <LogOut className="h-4 w-4" /> Logout
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mutation.isPending || same(saved, EMPTY)}
          onClick={() => {
            setDraft(EMPTY);
            save(EMPTY, 'Dashboard colors reset to default.');
          }}
        >
          Reset to default
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!dirty || invalid || mutation.isPending}
          onClick={() => save(draft, 'Dashboard colors saved.')}
          className="bg-[#2d4a35] text-white hover:bg-[#3c5e45]"
        >
          {mutation.isPending ? 'Saving…' : 'Save colors'}
        </Button>
      </div>
    </div>
  );
}

function PreviewItem({
  icon: Icon,
  label,
  active
}: {
  icon: typeof Package;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold',
        active
          ? 'bg-(--dash-accent) text-(--dash-accent-text)'
          : 'text-(--dash-text)'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function ColorField({
  label,
  hint,
  value,
  fallback,
  onChange
}: {
  label: string;
  hint: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}) {
  const shown = value || fallback;
  const bad = value !== '' && !isHexColor(value);
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        aria-label={label}
        value={isHexColor(shown) ? shown : fallback}
        onChange={e => onChange(e.target.value)}
        className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-transparent p-1 dark:border-gray-700"
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{hint}</div>
      </div>
      <Input
        value={value}
        placeholder={fallback}
        onChange={e => onChange(e.target.value.trim())}
        aria-invalid={bad}
        aria-label={`${label} hex`}
        className={cn('w-28 font-mono text-xs', bad && 'border-red-500')}
        maxLength={7}
      />
    </div>
  );
}
