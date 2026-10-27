'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {useRouter} from 'next/navigation';
import {useAddCustomerCartItemMutation} from '@/lib/hooks/cart/useCustomerCart';
import type {CustomerOccasion} from '@/lib/api/authApi';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';

const SYSTEM_OCCASIONS = [
  {label: "Noche Buena", month: 11, day: 24},
  {label: "Christmas", month: 11, day: 25},
  {label: "New Year", month: 0, day: 1}
];

function nextOccurrence(month: number, day: number): Date {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), month, day);
  if (candidate < now) candidate.setFullYear(candidate.getFullYear() + 1);
  return candidate;
}

function daysUntil(date: Date): number {
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function savedNext(occ: CustomerOccasion): Date {
  const d = new Date(occ.date);
  return nextOccurrence(d.getMonth(), d.getDate());
}

export function OccasionsCard({
  occasions,
  orders,
  onSave
}: {
  occasions: CustomerOccasion[];
  orders: OrderHistoryEntry[];
  onSave: (next: CustomerOccasion[]) => void;
}) {
  const router = useRouter();
  const addItem = useAddCustomerCartItemMutation();
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [adding, setAdding] = useState(false);

  const tiedOrder = (occ: CustomerOccasion) =>
    orders.find(o => o.occasionId && o.occasionId === occ._id) ?? null;

  const handleReorder = async (occ: CustomerOccasion) => {
    const order = tiedOrder(occ);
    if (!order) {
      toast.error('No past order tied to this occasion yet.');
      return;
    }
    try {
      for (const item of order.items) {
        const name =
          item.name ??
          (typeof item.productId === 'string'
            ? 'Item'
            : item.productId.name ?? 'Item');
        const productId =
          typeof item.productId === 'string'
            ? item.productId
            : item.productId._id;
        await addItem.mutateAsync({
          productId,
          name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl
        });
      }
      toast.success('Added to cart.');
      router.push('/customer/dashboard');
    } catch {
      toast.error('Could not add to cart. Try again.');
    }
  };

  const add = () => {
    if (!label.trim() || !date) {
      toast.error('Label and date are required.');
      return;
    }
    onSave([...occasions, {label: label.trim(), date}]);
    setLabel('');
    setDate('');
    setAdding(false);
    toast.success('Occasion saved.');
  };

  const remove = (idx: number) => {
    onSave(occasions.filter((_, i) => i !== idx));
  };

  // seasonal nudge
  const upcomingSaved = occasions
    .map(o => ({o, d: savedNext(o)}))
    .filter(x => daysUntil(x.d) <= 60 && daysUntil(x.d) >= 0);
  const upcomingSystem = SYSTEM_OCCASIONS.map(s => ({
    label: s.label,
    d: nextOccurrence(s.month, s.day)
  })).filter(x => daysUntil(x.d) <= 60 && daysUntil(x.d) >= 0);
  const nudgeList: {label: string; d: Date}[] = [
    ...upcomingSaved.map(x => ({label: x.o.label, d: x.d})),
    ...upcomingSystem
  ];
  const nudge = nudgeList[0];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Occasions</h2>
        <button
          type="button"
          onClick={() => setAdding(v => !v)}
          className="text-sm font-medium text-accent-warm"
        >
          {adding ? 'Cancel' : 'Add date'}
        </button>
      </div>

      {nudge && (
        <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {nudge.label} is in {daysUntil(nudge.d)} days. Reserve your lechon
          early for the best slot.
        </p>
      )}

      {occasions.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">
          No saved occasions yet. Add birthdays, fiestas, or reunions and we
          will remind you before the date.
        </p>
      )}

      <div className="space-y-3">
        {occasions.map((occ, idx) => {
          const d = savedNext(occ);
          const days = daysUntil(d);
          const order = tiedOrder(occ);
          return (
            <div
              key={occ._id ?? idx}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{occ.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric'
                    })}{' '}
                    · {days >= 0 ? `${days} days away` : 'past'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  aria-label="Remove occasion"
                  className="text-xs text-destructive"
                >
                  Remove
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleReorder(occ)}
                disabled={addItem.isPending || !order}
                className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-border px-3 text-xs font-medium disabled:opacity-50"
              >
                {order ? 'Reserve / Reorder' : 'No past order yet'}
              </button>
            </div>
          );
        })}
      </div>

      {adding && (
        <div className="mt-4 space-y-3">
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label (Mama's birthday)"
            className="min-h-[44px] w-full rounded-lg border border-border px-3 text-sm"
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-border px-3 text-sm"
          />
          <button
            type="button"
            onClick={add}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-accent-warm px-4 text-sm font-semibold text-accent-warm-foreground"
          >
            Save occasion
          </button>
        </div>
      )}
    </div>
  );
}
