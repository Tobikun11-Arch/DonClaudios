'use client';

import {z} from 'zod';
import {useState} from 'react';
import {toast} from 'sonner';
import type {CustomerPreferences} from '@/lib/api/authApi';

const schema = z.object({
  defaultFulfillment: z.enum(['pickup', 'delivery']).optional(),
  preferredLeadTimeDays: z.coerce.number().min(0).optional(),
  servingStyle: z.enum(['whole', 'chopped', 'plated']).optional(),
  sauceCount: z.coerce.number().min(0).optional()
});

export function PreferencesForm({
  preferences,
  onSave
}: {
  preferences: CustomerPreferences;
  onSave: (next: CustomerPreferences) => void;
}) {
  const [form, setForm] = useState<CustomerPreferences>(preferences);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<CustomerPreferences>) => {
    const next = {...form, ...patch};
    const parsed = schema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid value');
      return;
    }
    setError(null);
    setForm(next);
    onSave(next);
    toast.success('Saved.');
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-bold text-foreground">Preferences</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Default fulfillment</span>
          <select
            value={form.defaultFulfillment ?? 'pickup'}
            onChange={e =>
              update({
                defaultFulfillment: e.target.value as 'pickup' | 'delivery'
              })
            }
            className="min-h-[44px] w-full rounded-lg border border-border px-3 text-sm"
          >
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Preferred lead time (days)</span>
          <input
            type="number"
            min={0}
            value={form.preferredLeadTimeDays ?? 0}
            onChange={e =>
              update({preferredLeadTimeDays: Number(e.target.value)})
            }
            className="min-h-[44px] w-full rounded-lg border border-border px-3 text-sm"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Serving style</span>
          <select
            value={form.servingStyle ?? 'whole'}
            onChange={e =>
              update({
                servingStyle: e.target.value as
                  | 'whole'
                  | 'chopped'
                  | 'plated'
              })
            }
            className="min-h-[44px] w-full rounded-lg border border-border px-3 text-sm"
          >
            <option value="whole">Whole</option>
            <option value="chopped">Chopped</option>
            <option value="plated">Plated</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Sauce count</span>
          <input
            type="number"
            min={0}
            value={form.sauceCount ?? 0}
            onChange={e => update({sauceCount: Number(e.target.value)})}
            className="min-h-[44px] w-full rounded-lg border border-border px-3 text-sm"
          />
        </label>
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}
