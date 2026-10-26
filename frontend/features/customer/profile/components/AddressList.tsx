'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {Plus, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {CustomerAddress} from '@/lib/api/authApi';

function emptyAddress(): CustomerAddress {
  return {label: '', line: '', landmark: '', riderNotes: '', isDefault: false};
}

export function AddressList({
  addresses,
  onSave
}: {
  addresses: CustomerAddress[];
  onSave: (next: CustomerAddress[]) => void;
}) {
  const [items, setItems] = useState<CustomerAddress[]>(
    addresses.length ? addresses : []
  );
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<CustomerAddress>(emptyAddress());

  const commit = (next: CustomerAddress[]) => {
    setItems(next);
    onSave(next);
  };

  const setDefault = (idx: number) => {
    commit(items.map((a, i) => ({...a, isDefault: i === idx})));
  };

  const remove = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    if (next.length && !next.some(a => a.isDefault)) {
      next[0].isDefault = true;
    }
    commit(next);
    toast.success('Address removed.');
  };

  const add = () => {
    if (!draft.label.trim() || !draft.line.trim()) {
      toast.error('Label and address are required.');
      return;
    }
    const next = [
      ...items,
      {...draft, isDefault: items.length === 0}
    ];
    commit(next);
    setDraft(emptyAddress());
    setAdding(false);
    toast.success('Address saved.');
  };

  const updateField = (idx: number, key: keyof CustomerAddress, value: string) => {
    const next = items.map((a, i) =>
      i === idx ? {...a, [key]: value} : a
    );
    commit(next);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Addresses</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(v => !v)}
        >
          <Plus size={14} className="mr-1" />
          Add
        </Button>
      </div>

      {items.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">
          No saved addresses yet. Add Bahay, Opisina, or any spot we should
          deliver to.
        </p>
      )}

      <div className="space-y-4">
        {items.map((a, idx) => (
          <div
            key={a._id ?? idx}
            className="rounded-xl border border-border p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <Input
                value={a.label}
                onChange={e => updateField(idx, 'label', e.target.value)}
                placeholder="Label (Bahay, Opisina)"
                className="min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label="Remove address"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-destructive"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <Input
              value={a.line}
              onChange={e => updateField(idx, 'line', e.target.value)}
              placeholder="Street, barangay, city"
              className="min-h-[44px]"
            />
            <Input
              value={a.landmark ?? ''}
              onChange={e => updateField(idx, 'landmark', e.target.value)}
              placeholder="Landmark (e.g. beside 7-Eleven)"
              className="min-h-[44px]"
            />
            <Input
              value={a.riderNotes ?? ''}
              onChange={e => updateField(idx, 'riderNotes', e.target.value)}
              placeholder="Rider notes (gate code, call on arrival)"
              className="min-h-[44px]"
            />
            <button
              type="button"
              onClick={() => setDefault(idx)}
              className={`text-xs font-medium ${
                a.isDefault
                  ? 'text-accent-warm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {a.isDefault ? 'Default address' : 'Set as default'}
            </button>
          </div>
        ))}
      </div>

      {adding && (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 space-y-3">
          <Input
            value={draft.label}
            onChange={e => setDraft({...draft, label: e.target.value})}
            placeholder="Label (Bahay, Opisina)"
            className="min-h-[44px]"
          />
          <Input
            value={draft.line}
            onChange={e => setDraft({...draft, line: e.target.value})}
            placeholder="Street, barangay, city"
            className="min-h-[44px]"
          />
          <Input
            value={draft.landmark ?? ''}
            onChange={e => setDraft({...draft, landmark: e.target.value})}
            placeholder="Landmark"
            className="min-h-[44px]"
          />
          <Input
            value={draft.riderNotes ?? ''}
            onChange={e => setDraft({...draft, riderNotes: e.target.value})}
            placeholder="Rider notes"
            className="min-h-[44px]"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={add}>
              Save address
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
