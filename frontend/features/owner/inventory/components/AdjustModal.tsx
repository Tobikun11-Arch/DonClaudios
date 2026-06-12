'use client';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Package, Minus} from 'lucide-react';
import type {FormEvent} from 'react';
import {useState} from 'react';

interface Props {
  open: boolean;
  productName: string;
  currentStock: number;
  isPending: boolean;
  onConfirm: (quantity: number, reason: 'spoilage' | 'adjustment', note?: string) => void;
  onClose: () => void;
}

export function AdjustModal({
  open,
  productName,
  currentStock,
  isPending,
  onConfirm,
  onClose
}: Props) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<'spoilage' | 'adjustment'>('adjustment');
  const [note, setNote] = useState('');

  if (!open) return null;

  const qtyNum = parseInt(quantity, 10) || 0;
  const isIncrease = qtyNum > 0;
  const newStock = currentStock + (isIncrease ? qtyNum : -qtyNum);
  const canSubmit = qtyNum > 0 && newStock >= 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const actualQty = isIncrease ? qtyNum : -qtyNum;
    onConfirm(actualQty, reason, note.trim() || undefined);
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
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Minus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Adjust Stock</p>
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
                Adjustment Direction
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.abs(qtyNum).toString())}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    isIncrease || qtyNum === 0
                      ? 'bg-[#e9f5ee] text-[#2d4a35] border-[#c9e7d4]'
                      : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  + Increase
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (qtyNum > 0) {
                      setQuantity(`-${qtyNum}`);
                    } else {
                      setQuantity('-');
                    }
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    !isIncrease && qtyNum !== 0
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  - Decrease
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Quantity *
              </label>
              <Input
                type="number"
                step="1"
                placeholder="e.g. 5"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
                disabled={isPending}
                autoFocus
              />
              {qtyNum > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  New stock will be: <span className="font-semibold">{newStock}</span>
                </p>
              )}
              {newStock < 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Cannot decrease by {qtyNum} — only {currentStock} available
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Reason *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReason('adjustment')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    reason === 'adjustment'
                      ? 'bg-[#e9f5ee] text-[#2d4a35] border-[#c9e7d4]'
                      : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  Adjustment
                </button>
                <button
                  type="button"
                  onClick={() => setReason('spoilage')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    reason === 'spoilage'
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  Spoilage
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Note (optional)
              </label>
              <Input
                placeholder="e.g. Expired batch"
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
                disabled={isPending || !canSubmit}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isPending ? 'Adjusting...' : 'Confirm Adjustment'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
