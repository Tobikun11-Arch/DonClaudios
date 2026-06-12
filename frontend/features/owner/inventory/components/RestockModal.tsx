'use client';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Package, Plus} from 'lucide-react';
import type {FormEvent} from 'react';
import {useState} from 'react';

interface Props {
  open: boolean;
  productName: string;
  currentStock: number;
  isPending: boolean;
  onConfirm: (quantity: number, note?: string) => void;
  onClose: () => void;
}

export function RestockModal({
  open,
  productName,
  currentStock,
  isPending,
  onConfirm,
  onClose
}: Props) {
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) return;
    onConfirm(qty, note.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-100">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <div className="w-full sm:max-w-md bg-white shadow-xl border border-gray-100 rounded-t-2xl sm:rounded-2xl flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Restock Product</p>
              <p className="text-xs text-gray-500">
                Current stock: <span className="font-semibold">{currentStock}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Product
              </label>
              <p className="text-sm text-gray-900 font-medium">{productName}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Quantity to add *
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 50"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
                disabled={isPending}
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Note (optional)
              </label>
              <Input
                placeholder="e.g. Delivery from supplier"
                value={note}
                onChange={e => setNote(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !quantity || parseInt(quantity, 10) <= 0}
                className="flex-1 bg-[#2d4a35] hover:bg-[#24402c] text-white"
              >
                <Plus className="h-4 w-4" />
                {isPending ? 'Restocking...' : 'Restock'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
