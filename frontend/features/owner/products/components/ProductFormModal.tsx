'use client';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  getCategoryByName,
  isCateringCategory,
  stockUnitLabel
} from '@/lib/categories/categoryUtils';
import {type Category} from '@/lib/types/category';
import {type IngredientItem} from '@/lib/types/ingredient';
import {
  type ProductAllergen,
  type ProductIngredient
} from '@/lib/types/product';
import {cn} from '@/lib/utils';
import {useDefaultPrepMinutes} from '@/lib/hooks/useDefaultPrepMinutes';
import {Upload} from 'lucide-react';
import Image from 'next/image';
import {type DragEvent, type FormEvent} from 'react';
import {type ProductFormState} from '@/lib/types/products';
import {
  isPreOrderCategory,
  PRE_ORDER_CATEGORIES,
  todayInStoreTimezone
} from '@/lib/preOrder/preOrder';
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
  /** Routed through the hook so picking a non-eligible category clears pre-order. */
  onCategoryChange: (category: string) => void;
  /** Same reason: turning pre-order off clears the limit, date and batches. */
  onPreOrderChange: (value: 'yes' | 'no') => void;
  /** How many batch windows the owner wants (1–4). */
  onBatchCountChange: (count: number) => void;
  /** Edit one field of one batch window. */
  onBatchChange: (
    index: number,
    field: 'startTime' | 'endTime' | 'stock',
    value: string
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
  onCategoryChange,
  onPreOrderChange,
  onBatchCountChange,
  onBatchChange,
  onFileChange,
  onDrop,
  onDragEnter,
  onDragLeave
}: Props) {
  const isDisabled = submitStatus !== 'idle' || isPending;
  const defaultPrepMinutes = useDefaultPrepMinutes();
  const selectedCategory = getCategoryByName(categories, form.category);
  const legacyCategory =
    form.category && !selectedCategory ? form.category : null;
  const bulk = isCateringCategory(categories, form.category);
  const canPreOrder = isPreOrderCategory(form.category);
  const preOrderOn = canPreOrder && form.isPreOrder === 'yes';
  const minDeadline = todayInStoreTimezone();

  const batchCount = Number(form.preOrderBatchCount) || 1;
  const batchRows = form.preOrderBatches.slice(0, batchCount);
  const batchStockTotal = batchRows.reduce(
    (sum, row) => sum + (Number(row.stock) || 0),
    0
  );

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
              onChange={e => onCategoryChange(e.target.value)}
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
                  <option value="">
                    {legacyCategory ? 'Choose a category' : 'Select a category'}
                  </option>
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
              <p className="text-xs text-gray-500 hidden" />
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
                value={preOrderOn ? String(batchStockTotal) : form.stock}
                onChange={e => onFormChange('stock', e.target.value)}
                readOnly={preOrderOn}
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
            <p
              className={
                preOrderOn ? 'text-xs text-gray-500' : 'text-xs text-gray-500 hidden'
              }
            >
              {preOrderOn ? 'Totals the batch windows below automatically.' : ''}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prepTimeMinutes">Prep time</Label>
          <div className="relative">
            <Input
              id="prepTimeMinutes"
              inputMode="numeric"
              value={form.prepTimeMinutes}
              onChange={e => onFormChange('prepTimeMinutes', e.target.value)}
              placeholder={String(defaultPrepMinutes)}
              className="pr-14"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
              min
            </span>
          </div>
          <p className="text-xs text-gray-500">
            How long the kitchen takes to make this. An order is estimated by
            its slowest item, and cashiers get alerted if it runs past that.
            {form.prepTimeMinutes.trim() === '' && (
              <>
                {' '}
                Leave blank to use the store default of {
                  defaultPrepMinutes
                }{' '}
                min.
              </>
            )}
          </p>
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

        {/* Pre-order — only offered in the eligible categories. */}
        {canPreOrder && (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="isPreOrder">Pre-order</Label>
              <select
                id="isPreOrder"
                value={form.isPreOrder}
                onChange={e =>
                  onPreOrderChange(e.target.value as 'yes' | 'no')
                }
                disabled={isDisabled}
                className={cn(
                  'h-9 w-full min-w-0 rounded-md border border-input bg-white px-2.5 text-base shadow-xs outline-none transition-[color,box-shadow]',
                  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
                )}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
              <p className="text-xs text-gray-600">
                Pre-order items are only visible to signed-in customers, and
                customers can only order them while a batch window is open.
              </p>
            </div>

            {preOrderOn && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="preOrderPurchaseLimit">
                      Purchase limit per batch
                    </Label>
                    <div className="relative">
                      <Input
                        id="preOrderPurchaseLimit"
                        type="number"
                        inputMode="numeric"
                        step={1}
                        min={1}
                        required
                        value={form.preOrderPurchaseLimit}
                        onChange={e =>
                          onFormChange('preOrderPurchaseLimit', e.target.value)
                        }
                        placeholder="e.g. 2"
                        className="pr-16"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                        max
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      The most one customer can order of this item per batch
                      window.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="preOrderDeadline">Pre-order date</Label>
                    <Input
                      id="preOrderDeadline"
                      type="date"
                      required
                      min={minDeadline}
                      value={form.preOrderDeadline}
                      onChange={e =>
                        onFormChange('preOrderDeadline', e.target.value)
                      }
                    />
                    <p className="text-xs text-gray-600">
                      The day customers can pre-order. Every batch window below
                      runs on this date.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="preOrderBatchCount">Batches</Label>
                  <select
                    id="preOrderBatchCount"
                    value={form.preOrderBatchCount}
                    onChange={e =>
                      onBatchCountChange(Number(e.target.value))
                    }
                    disabled={isDisabled}
                    className={cn(
                      'h-9 w-full min-w-0 rounded-md border border-input bg-white px-2.5 text-base shadow-xs outline-none transition-[color,box-shadow]',
                      'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                      'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
                    )}
                  >
                    {[1, 2, 3, 4].map(n => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'batch' : 'batches'}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600">
                    Stock is split across the windows, and customers can only
                    add to cart while one of them is running.
                  </p>
                </div>

                <div className="space-y-2">
                  {batchRows.map((row, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-purple-200 bg-white p-3"
                    >
                      <p className="text-xs font-bold text-purple-800 mb-2">
                        Batch {index + 1}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`batchStart-${index}`}
                            className="text-xs text-gray-600"
                          >
                            Starts
                          </Label>
                          <Input
                            id={`batchStart-${index}`}
                            type="time"
                            required
                            value={row.startTime}
                            onChange={e =>
                              onBatchChange(index, 'startTime', e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`batchEnd-${index}`}
                            className="text-xs text-gray-600"
                          >
                            Ends
                          </Label>
                          <Input
                            id={`batchEnd-${index}`}
                            type="time"
                            required
                            value={row.endTime}
                            onChange={e =>
                              onBatchChange(index, 'endTime', e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`batchStock-${index}`}
                            className="text-xs text-gray-600"
                          >
                            Stock
                          </Label>
                          <Input
                            id={`batchStock-${index}`}
                            type="number"
                            inputMode="numeric"
                            step={1}
                            min={1}
                            required
                            value={row.stock}
                            onChange={e =>
                              onBatchChange(index, 'stock', e.target.value)
                            }
                            placeholder="e.g. 30"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Remind the owner why pre-order is unavailable here, instead of
            silently hiding it. */}
        {mode === 'create' &&
          form.category.trim() &&
          !canPreOrder &&
          form.category.toLowerCase() !== 'promo' && (
            <p className="text-xs text-gray-500">
              Pre-order is available for:{' '}
              {PRE_ORDER_CATEGORIES.join(', ')}.
            </p>
          )}

        {/* Promo-specific fields - shown when category is 'promo' */}
        {form.category.toLowerCase() === 'promo' && (
          <>
            <div className="rounded-xl border border-[#2d4a35]/20 bg-[#e9f5ee]/50 p-4">
              <p className="text-sm font-semibold text-[#2d4a35] mb-3">
                Promo Settings
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="promoType">Promo Type</Label>
                  <select
                    id="promoType"
                    value={form.promoType}
                    onChange={e =>
                      onFormChange(
                        'promoType',
                        e.target.value as
                          | 'percentage'
                          | 'fixed_amount'
                          | 'bundle'
                      )
                    }
                    disabled={isDisabled}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs outline-none disabled:opacity-50 md:text-sm"
                  >
                    <option value="percentage">Percentage Discount</option>
                    <option value="fixed_amount">Fixed Amount Discount</option>
                    <option value="bundle">Bundle Deal</option>
                  </select>
                </div>

                {form.promoType === 'percentage' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="discountRate">Discount Rate (%)</Label>
                    <Input
                      id="discountRate"
                      inputMode="decimal"
                      value={form.discountRate}
                      onChange={e =>
                        onFormChange('discountRate', e.target.value)
                      }
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
                      onChange={e =>
                        onFormChange('discountAmount', e.target.value)
                      }
                      placeholder="e.g. 50"
                      disabled={isDisabled}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="promoStartDate">Start Date</Label>
                    <Input
                      id="promoStartDate"
                      type="date"
                      value={form.promoStartDate}
                      onChange={e =>
                        onFormChange('promoStartDate', e.target.value)
                      }
                      disabled={isDisabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="promoEndDate">End Date</Label>
                    <Input
                      id="promoEndDate"
                      type="date"
                      value={form.promoEndDate}
                      onChange={e =>
                        onFormChange('promoEndDate', e.target.value)
                      }
                      disabled={isDisabled}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="isPromoActive"
                    type="checkbox"
                    checked={form.isPromoActive}
                    onChange={e =>
                      onFormChange('isPromoActive', e.target.checked)
                    }
                    disabled={isDisabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isPromoActive">Active Promo</Label>
                </div>
              </div>
            </div>
          </>
        )}

        {bulk ? null : (
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
