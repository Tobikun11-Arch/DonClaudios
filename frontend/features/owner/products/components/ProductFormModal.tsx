import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {cn} from '@/lib/utils';
import {Upload} from 'lucide-react';
import Image from 'next/image';
import {type DragEvent, type FormEvent} from 'react';
import {type ProductFormState} from '@/lib/types/products';
import {Modal} from './Modal';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  form: ProductFormState;
  formError: string | null;
  previewUrl: string | null;
  isDragging: boolean;
  submitStatus: 'idle' | 'uploading' | 'submitting';
  isPending: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onFormChange: (
    field: keyof ProductFormState,
    value: string | boolean
  ) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: DragEvent<HTMLButtonElement>) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
}

export function ProductFormModal({
  open,
  mode,
  form,
  formError,
  previewUrl,
  isDragging,
  submitStatus,
  isPending,
  onClose,
  onSubmit,
  onFormChange,
  onFileChange,
  onDrop,
  onDragEnter,
  onDragLeave
}: Props) {
  const isDisabled = submitStatus !== 'idle' || isPending;

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Add Product' : 'Edit Product'}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          id="productImage"
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
          disabled={isDisabled}
        />
        <div className="w-full h-full flex i justify-center items-center">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('productImage');
              if (el instanceof HTMLInputElement) el.click();
            }}
            onDragOver={e => e.preventDefault()}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            disabled={isDisabled}
            className={cn(
              'relative mt-1 w-full sm:w-3/4 rounded-2xl border-2 border-dashed transition-colors overflow-hidden bg-white',
              'aspect-[16/9] sm:aspect-[2/1]',
              isDragging
                ? 'border-[#2d4a35] bg-[#e9f5ee]'
                : 'border-[#c9e7d4] hover:border-[#2d4a35]'
            )}
          >
            {previewUrl ? (
              <>
                <Image
                  src={previewUrl}
                  alt="Product image preview"
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
                  <p className="text-sm font-extrabold">Upload product image</p>
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
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => onFormChange('name', e.target.value)}
              placeholder="e.g. Lechon Belly 1kg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={form.category}
              onChange={e => onFormChange('category', e.target.value)}
              placeholder="e.g. Lechon"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              inputMode="decimal"
              value={form.price}
              onChange={e => onFormChange('price', e.target.value)}
              placeholder="e.g. 4500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              inputMode="numeric"
              value={form.stock}
              onChange={e => onFormChange('stock', e.target.value)}
              placeholder="e.g. 10"
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
              ? 'Uploading image…'
              : submitStatus === 'submitting'
                ? 'Saving…'
                : mode === 'create'
                  ? 'Save Product'
                  : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
