'use client';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {cn} from '@/lib/utils';
import {Upload} from 'lucide-react';
import Image from 'next/image';
import {type DragEvent, type FormEvent} from 'react';
import {type PromoFormState} from '@/lib/types/promos';
import {Modal} from './Modal';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  form: PromoFormState;
  formError: string | null;
  previewUrl: string | null;
  isDragging: boolean;
  submitStatus: 'idle' | 'uploading' | 'submitting';
  isPending: boolean;
  products: Array<{_id: string; name: string; category?: string}>;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onFormChange: (
    field: keyof PromoFormState,
    value: string | boolean | string[]
  ) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: DragEvent<HTMLButtonElement>) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
}

export function PromoFormModal({
  open,
  mode,
  form,
  formError,
  previewUrl,
  isDragging,
  submitStatus,
  isPending,
  products,
  onClose,
  onSubmit,
  onFormChange,
  onFileChange,
  onDrop,
  onDragEnter,
  onDragLeave
}: Props) {
  const isDisabled = submitStatus !== 'idle' || isPending;
  const showProducts =
    form.promoType === 'percentage' ||
    form.promoType === 'fixed_amount' ||
    form.promoType === 'bundle';

  const toggleProductId = (id: string) => {
    const exists = form.productIds.includes(id);
    const next = exists
      ? form.productIds.filter(x => x !== id)
      : [...form.productIds, id];
    onFormChange('productIds', next);
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Add Promo' : 'Edit Promo'}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          id="promoImage"
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
          disabled={isDisabled}
        />

        <div className="w-full flex justify-center items-center">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('promoImage');
              if (el instanceof HTMLInputElement) el.click();
            }}
            onDragOver={e => e.preventDefault()}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            disabled={isDisabled}
            className={cn(
              'relative mt-1 w-full rounded-2xl border-2 border-dashed transition-colors overflow-hidden bg-white',
              'aspect-[16/9]',
              isDragging
                ? 'border-[#2d4a35] bg-[#e9f5ee]'
                : 'border-[#c9e7d4] hover:border-[#2d4a35]'
            )}
          >
            {previewUrl ? (
              <>
                <Image
                  src={previewUrl}
                  alt="Promo image preview"
                  fill
                  className="object-cover object-center"
                  unoptimized
                  sizes="512px"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/45 text-white text-xs px-3 py-2 z-10">
                  Click to replace or drag and drop
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#2d4a35]">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-[#e9f5ee] flex items-center justify-center">
                  <Upload className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-extrabold">Upload promo image</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click to choose or drag and drop here
                  </p>
                </div>
              </div>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={e => onFormChange('title', e.target.value)}
              placeholder="e.g. Fiesta Promo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promoType">Promo Type</Label>
            <select
              id="promoType"
              value={form.promoType}
              onChange={e =>
                onFormChange(
                  'promoType',
                  e.target.value as PromoFormState['promoType']
                )
              }
              disabled={isDisabled}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs outline-none disabled:opacity-50 md:text-sm"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
              <option value="bundle">Bundle</option>
            </select>
          </div>
          {form.promoType === 'bundle' && (
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (₱)</Label>
              <Input
                id="price"
                inputMode="decimal"
                value={form.price}
                onChange={e => onFormChange('price', e.target.value)}
                placeholder="e.g. 499"
                disabled={isDisabled}
              />
            </div>
          )}

          {form.promoType === 'percentage' && (
            <div className="space-y-1.5">
              <Label htmlFor="discountRate">Discount Rate (%)</Label>
              <Input
                id="discountRate"
                inputMode="decimal"
                value={form.discountRate}
                onChange={e => onFormChange('discountRate', e.target.value)}
                placeholder="e.g. 20"
                disabled={isDisabled}
              />
            </div>
          )}

          {form.promoType === 'fixed_amount' && (
            <div className="space-y-1.5">
              <Label htmlFor="discountAmount">Discount Amount (₱)</Label>
              <Input
                id="discountAmount"
                inputMode="decimal"
                value={form.discountAmount}
                onChange={e => onFormChange('discountAmount', e.target.value)}
                placeholder="e.g. 50"
                disabled={isDisabled}
              />
            </div>
          )}

          {showProducts && (
            <div className="space-y-1.5">
              <Label>
                {form.promoType === 'bundle' ? 'Included Products' : 'Products'}
              </Label>
              <details className="relative">
                <summary
                  className={cn(
                    'h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none',
                    isDisabled
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  )}
                >
                  {form.productIds.length > 0
                    ? `${form.productIds.length} selected`
                    : 'Select products'}
                </summary>
                <div className="absolute z-50 mt-2 w-full max-h-64 overflow-auto rounded-md border border-gray-100 bg-white shadow-lg p-2">
                  {products.map(p => {
                    const checked = form.productIds.includes(p._id);
                    return (
                      <label
                        key={p._id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProductId(p._id)}
                          disabled={isDisabled}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-gray-800">
                          {p.name}
                          {p.category ? ` (${p.category})` : ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </details>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={e => onFormChange('startDate', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={form.endDate}
              onChange={e => onFormChange('endDate', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={form.description}
            onChange={e => onFormChange('description', e.target.value)}
            placeholder="Short description"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="isActive"
            type="checkbox"
            checked={form.isActive}
            onChange={e => onFormChange('isActive', e.target.checked)}
            disabled={isDisabled}
            className="h-4 w-4"
          />
          <Label htmlFor="isActive">Active</Label>
        </div>

        {formError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {formError}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDisabled}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#2d4a35] hover:bg-[#24402c]"
            disabled={isDisabled}
          >
            {submitStatus === 'uploading'
              ? 'Uploading...'
              : submitStatus === 'submitting'
                ? 'Saving...'
                : mode === 'create'
                  ? 'Save Promo'
                  : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
