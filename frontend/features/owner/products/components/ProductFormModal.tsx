'use client';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  CATEGORY_TYPE_LABELS,
  STOCK_UNIT_HINTS,
  getCategoryByName,
  isCateringCategory,
  stockUnitLabel
} from '@/lib/categories/categoryUtils';
import {type Category} from '@/lib/types/category';
import {type IngredientItem} from '@/lib/types/ingredient';
import {type ProductAllergen, type ProductIngredient} from '@/lib/types/product';
import {cn} from '@/lib/utils';
import {Upload} from 'lucide-react';
import Image from 'next/image';
import {type DragEvent, type FormEvent} from 'react';
import {type ProductFormState} from '@/lib/types/products';
import {AllergenChecklist} from './AllergenChecklist';
import {IngredientChipsInput} from './IngredientChipsInput';
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
  categories: Category[];
  categoriesLoading?: boolean;
  ingredientLibrary: IngredientItem[];
  ingredientLibraryLoading: boolean;
  onAddIngredientToLibrary?: (name: string) => Promise<IngredientItem | null>;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onFormChange: (
    field: keyof ProductFormState,
    value: string | boolean | ProductIngredient[] | ProductAllergen[]
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
  categories,
  categoriesLoading = false,
  ingredientLibrary,
  ingredientLibraryLoading,
  onAddIngredientToLibrary,
  onClose,
  onSubmit,
  onFormChange,
  onFileChange,
  onDrop,
  onDragEnter,
  onDragLeave
}: Props) {
  const isDisabled = submitStatus !== 'idle' || isPending;
  const selectedCategory = getCategoryByName(categories, form.category);
  const legacyCategory =
    form.category && !selectedCategory ? form.category : null;
  const bulk = isCateringCategory(categories, form.category);

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

        <div className="w-full flex justify-center items-center">
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
                  <p className="text-xs text-gray-400 mt-0.5">
                    Image will be auto-cropped to 16:9
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
            <select
              id="category"
              value={form.category}
              onChange={e => onFormChange('category', e.target.value)}
              disabled={isDisabled || categoriesLoading}
              className={cn(
                'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 text-base shadow-xs outline-none transition-[color,box-shadow]',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
              )}
            >
              {categoriesLoading ? (
                <option value="">Loading categories...</option>
              ) : (
                <>
                  <option value="">{legacyCategory ? 'Choose a category' : 'Select a category'}</option>
                  {legacyCategory && (
                    <option value={form.category} disabled>
                      {form.category} (not in your list — pick one below)
                    </option>
                  )}
                  {categories.map(c => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            {!categoriesLoading && selectedCategory && (
              <p className="text-xs text-gray-500">
                {CATEGORY_TYPE_LABELS[selectedCategory.type]} · stock tracked
                in {STOCK_UNIT_HINTS[selectedCategory.stockUnit]}
              </p>
            )}
            {legacyCategory && (
              <p className="text-xs text-amber-700">
                &quot;{legacyCategory}&quot; is not in your category list. Pick
                a category above to keep this product working.
              </p>
            )}
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
            <div className="relative">
              <Input
                id="stock"
                inputMode="numeric"
                value={form.stock}
                onChange={e => onFormChange('stock', e.target.value)}
                placeholder="0"
                className="pr-16"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                {selectedCategory
                  ? stockUnitLabel(selectedCategory.stockUnit)
                  : legacyCategory
                    ? 'unit?'
                    : categoriesLoading
                      ? '...'
                      : 'unit'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {selectedCategory
                ? `Unit is locked to ${STOCK_UNIT_HINTS[selectedCategory.stockUnit]} for "${selectedCategory.name}".`
                : legacyCategory
                  ? 'This legacy category has no unit. Reassign above to fix stock units.'
                  : 'Choose a category to lock the stock unit.'}
            </p>
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

        {bulk ? (
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500">
            Ingredient and allergen tags are skipped for catering / by-weight
            items.
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>Ingredients</Label>
              <IngredientChipsInput
                ingredients={form.ingredients}
                onChange={value => onFormChange('ingredients', value)}
                library={ingredientLibrary}
                isLibraryLoading={ingredientLibraryLoading}
                onAddToLibrary={onAddIngredientToLibrary}
                disabled={isDisabled}
              />
              <p className="text-xs text-gray-500">
                Search the ingredient library and select to add. At least 1 is
                required. Not in the library? Type it and choose &quot;Add as
                new ingredient&quot;.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Allergens</Label>
              <AllergenChecklist
                value={form.allergens}
                onChange={value => onFormChange('allergens', value)}
                disabled={isDisabled}
              />
              <p className="text-xs text-gray-500">
                Optional. Leave empty for &quot;No known allergens&quot;.
              </p>
            </div>
          </>
        )}

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
              ? 'Uploading...'
              : mode === 'create'
              ? 'Save Product'
              : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
