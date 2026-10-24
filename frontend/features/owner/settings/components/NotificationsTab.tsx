'use client';

import {useEffect, useState} from 'react';
import {cn} from '@/lib/utils';

const STORAGE_KEY = 'owner:notification-settings';

function readStorage(): Record<string, Record<string, boolean>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, Record<string, boolean>>;
    return {};
  } catch {
    return {};
  }
}

function writeStorage(all: Record<string, Record<string, boolean>>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

function loadSection(section: string): Record<string, boolean> {
  const cfg = SECTIONS[section];
  if (!cfg) return {};
  const stored = readStorage()[section] || {};
  return Object.fromEntries(
    cfg.items.map(item => [
      item.label,
      typeof stored[item.label] === 'boolean' ? stored[item.label] : item.defaultOn
    ])
  );
}

function saveSection(section: string, state: Record<string, boolean>) {
  const all = readStorage();
  all[section] = state;
  writeStorage(all);
}

type Item = {label: string; description: string; defaultOn: boolean};

const SECTIONS: Record<string, {title: string; subtitle?: string; items: Item[]}> = {
  preorders: {
    title: 'Pre-orders',
    subtitle: 'Lechon batches are your biggest-ticket items',
    items: [
      {label: 'Pre-order batch almost full', description: "When a batch's remaining kg falls below a set level", defaultOn: true},
      {label: 'Pre-order batch sold out', description: 'When a batch hits zero', defaultOn: true},
      {label: 'Pre-order window closed', description: 'When a pre-order closes automatically', defaultOn: false}
    ]
  },
  inventory: {
    title: 'Inventory',
    items: [
      {label: 'Low stock alerts', description: 'When stock falls below reorder level', defaultOn: true},
      {label: 'Out of stock', description: 'When an item reaches zero (and drops off the menu)', defaultOn: true},
      {label: 'Spoilage / large adjustments', description: 'When stock is removed as spoilage or a large negative adjustment is made', defaultOn: false}
    ]
  },
  customers: {
    title: 'Customers',
    items: [
      {label: 'New reviews', description: 'A review needs approval (Pending)', defaultOn: true},
      {label: 'Flagged reviews', description: 'A review was flagged', defaultOn: true},
      {label: 'Customer replies', description: 'A customer replies in a review conversation', defaultOn: true},
      {label: 'New chat messages', description: 'A customer sends a chat message', defaultOn: true},
      {label: 'New sign-ups', description: 'A new customer registers', defaultOn: false}
    ]
  },
  reports: {
    title: 'Reports and performance',
    items: [
      {label: 'Daily sales summary', description: 'Revenue collected and still open, sent at closing time', defaultOn: false},
      {label: 'High cancellation rate', description: 'When the rate passes a set percentage', defaultOn: false},
      {label: 'Kitchen prep times missing', description: "Mirrors the dashboard warning that on-time rate can't be measured", defaultOn: false}
    ]
  },
  account: {
    title: 'Account',
    items: [
      {label: 'New login', description: 'Security alert when a new login occurs on the owner account', defaultOn: true},
      {label: 'Password change', description: 'Security alert when the owner account password is changed', defaultOn: true}
    ]
  }
};

function Toggle({on, onChange}: {on: boolean; onChange: (v: boolean) => void}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        on ? 'bg-[#2d4a35]' : 'bg-gray-300'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

export function NotificationsTab({section}: {section: string}) {
  const cfg = SECTIONS[section];
  const [state, setState] = useState<Record<string, boolean>>(() => {
    // Start from defaults during SSR / first client render to avoid hydration mismatch.
    return Object.fromEntries(cfg.items.map(i => [i.label, i.defaultOn]));
  });

  // Load persisted values whenever the active section changes.
  useEffect(() => {
    setState(loadSection(section));
  }, [section]);

  const handleToggle = (label: string, value: boolean) => {
    setState(prev => {
      const next = {...prev, [label]: value};
      saveSection(section, next);
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <h2 className="mb-1 text-lg font-bold text-[#2d4a35]">
        {cfg.title}
      </h2>
      {cfg.subtitle && (
        <p className="mb-5 text-sm text-gray-500">{cfg.subtitle}</p>
      )}
      {!cfg.subtitle && <div className="mb-5" />}
      <div className="divide-y divide-gray-100">
        {cfg.items.map(item => (
          <div
            key={item.label}
            className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900">
                {item.label}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                {item.description}
              </div>
            </div>
            <div className="shrink-0">
              <Toggle
                on={state[item.label]}
                onChange={v => handleToggle(item.label, v)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
