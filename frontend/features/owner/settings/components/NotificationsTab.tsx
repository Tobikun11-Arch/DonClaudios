'use client';

import {useState} from 'react';
import {cn} from '@/lib/utils';

type Item = {label: string; description: string; defaultOn: boolean};

const SECTIONS: Record<string, {title: string; subtitle?: string; items: Item[]}> = {
  orders: {
    title: 'Orders',
    items: [
      {label: 'New orders', description: 'When a customer places an order', defaultOn: true},
      {label: 'New reservations', description: 'When a customer books a reservation', defaultOn: true},
      {label: 'Cancelled orders', description: 'When an order is cancelled', defaultOn: true},
      {label: 'Stuck orders', description: 'Order open 7+ days, never completed or cancelled', defaultOn: true}
    ]
  },
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
      {label: 'New login / password change', description: 'Security alert for the owner account', defaultOn: true}
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
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(cfg.items.map(i => [i.label, i.defaultOn]))
  );

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
                onChange={v => setState(s => ({...s, [item.label]: v}))}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
