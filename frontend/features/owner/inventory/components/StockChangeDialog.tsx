'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';
import {Package, Plus, Minus, Trash2, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';
import {stockUnitLabel} from '@/lib/categories/categoryUtils';
import type {Product} from '@/lib/types/product';

export type StockActionMode = 'restock' | 'remove';
export type StockRemoveReason = 'adjustment' | 'spoilage';

interface Props {
  open: boolean;
  product: Product | null;
  mode: StockActionMode;
  initialReason: StockRemoveReason;
  isPending: boolean;
  onConfirm: (
    quantity: number,
    reason: StockRemoveReason | null,
    note?: string
  ) => void;
  onClose: () => void;
}

const QUICK_AMOUNTS = [5, 10, 20];

function confirmLabel(mode: StockActionMode, reason: StockRemoveReason): string {
  if (mode === 'restock') return 'Restock';
  return reason === 'spoilage' ? 'Record spoilage' : 'Remove stock';
}

export function StockChangeDialog({
  open,
  product,
  mode,
  initialReason,
  isPending,
  onConfirm,
  onClose
}: Props) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<StockRemoveReason>(initialReason);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, isPending, onClose]);

  if (!open || !product) return null;

  const unit = stockUnitLabel(product.stockUnit);
  const unitSuffix = unit ? ` ${unit}` : '';
  const qtyNum = parseInt(quantity, 10) || 0;
  const isRemove = mode === 'remove';

  const newStock = isRemove ? product.stock - qtyNum : product.stock + qtyNum;
  const belowZero = isRemove && newStock < 0;
  const valid = qtyNum > 0 && !belowZero;

  const Label = confirmLabel(mode, reason);

  const notePlaceholder = isRemove
    ? reason === 'spoilage'
      ? 'What happened? (e.g. spoiled in storage)'
      : 'Note (optional)'
    : 'Note (optional)';

  const onSubmit = () => {
    if (!valid || isPending) return;
    onConfirm(qtyNum, isRemove ? reason : null, note.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !isPending && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close dialog"
      />
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <div className="w-full sm:max-w-[440px] bg-white shadow-xl border border-gray-100 rounded-t-2xl sm:rounded-2xl flex flex-col">
          <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={44}
                  height={44}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package className="h-5 w-5 text-gray-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900">
                {product.name}
              </p>
              <p className="text-xs text-gray-500">
                Current stock:{' '}
                <span className="font-semibold">{product.stock}</span>
                {unitSuffix}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                {isRemove ? 'Quantity to remove *' : 'Quantity to add *'}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  disabled={isPending}
                  autoFocus
                  className="h-12 text-lg font-bold"
                />
                {unit && (
                  <span className="text-sm font-semibold text-gray-500">
                    {unit}
                  </span>
                )}
              </div>

              {!isRemove && (
                <div className="mt-2 flex gap-1.5">
                  {QUICK_AMOUNTS.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuantity(String(n))}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 transition-colors hover:border-[#2d4a35] hover:text-[#2d4a35]"
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isRemove && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Reason *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReason('adjustment')}
                    className={cn(
                      'flex-1 rounded-xl border py-2.5 px-3 text-xs font-bold transition-colors',
                      reason === 'adjustment'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                    )}
                  >
                    Correction
                  </button>
                  <button
                    type="button"
                    onClick={() => setReason('spoilage')}
                    className={cn(
                      'flex-1 rounded-xl border py-2.5 px-3 text-xs font-bold transition-colors',
                      reason === 'spoilage'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                    )}
                  >
                    Spoilage
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Note
              </label>
              <Input
                placeholder={notePlaceholder}
                value={note}
                onChange={e => setNote(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div
              className={cn(
                'flex items-center justify-between rounded-xl border px-4 py-3 text-sm',
                belowZero
                  ? 'border-red-200 bg-red-50/60 text-red-700'
                  : 'border-gray-100 bg-gray-50/60 text-gray-700'
              )}
            >
              <span className="font-medium">New stock</span>
              <span className="font-extrabold tabular-nums">
                {product.stock}
                {unitSuffix} → {belowZero ? newStock : newStock}
                {unitSuffix}
              </span>
            </div>

            {belowZero && (
              <p className="text-xs font-semibold text-red-600">
                Cannot remove more than what is in stock.
              </p>
            )}

            <div className="flex gap-3 pt-1">
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
                type="button"
                onClick={onSubmit}
                disabled={isPending || !valid}
                className={cn(
                  'flex-1',
                  isRemove
                    ? reason === 'spoilage'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-[#2d4a35] hover:bg-[#24402c] text-white'
                )}
              >
                {mode === 'restock' ? (
                  <Plus className="h-4 w-4" />
                ) : reason === 'spoilage' ? (
                  <Trash2 className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                {isPending ? `${Label}...` : Label}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}