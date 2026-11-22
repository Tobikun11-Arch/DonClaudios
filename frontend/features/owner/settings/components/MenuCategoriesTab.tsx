'use client';

import {useRef, useState} from 'react';
import Image from 'next/image';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  CATEGORY_TYPE_SHORT,
  STOCK_UNIT_HINTS,
  STOCK_UNIT_LABELS
} from '@/lib/categories/categoryUtils';
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useReorderCategoriesMutation,
  useUpdateCategoryMutation
} from '@/lib/hooks/categories/useCategories';
import type {
  Category,
  CategoryType,
  StockUnit
} from '@/lib/types/category';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {ImageCropModal} from '@/features/owner/products/components/ImageCropModal';
import {uploadCategoryImage} from '@/lib/api/uploadApi';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pin,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {enterNavigation} from '@/shared/utils/enterNavigation';

const CATEGORY_PLACEHOLDER = '/assets/category_placeholder.svg';

const TYPE_OPTIONS: {value: CategoryType; label: string}[] = [
  {value: 'catering', label: 'Sold by weight / catering'},
  {value: 'in_store', label: 'Per plate / piece (in-store)'}
];

const UNIT_OPTIONS: {value: StockUnit; label: string}[] = [
  {value: 'kg', label: 'Kilograms (kg)'},
  {value: 'piece', label: 'Pieces / servings (pcs)'},
  {value: 'can', label: 'Cans'},
  {value: 'pitcher', label: 'Pitchers'}
];

function Field({
  id,
  label,
  children
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

// Matches `components/ui/input.tsx`: `text-base md:text-sm` keeps phone form
// text at 16px (so iOS does not zoom on focus) and lines up with the `Input`
// rendered directly beside these selects, which used to look smaller.
const selectClass =
  'h-10 w-full rounded-md border border-input bg-transparent px-2.5 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 md:text-sm';

function CategoryImagePicker({
  preview,
  onChoose,
  onRemove,
  uploading
}: {
  preview: string | null;
  onChoose: () => void;
  onRemove: () => void;
  uploading: boolean;
}) {
  return (
    <div>
      <Label>Image (optional)</Label>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
          <Image
            src={preview ?? CATEGORY_PLACEHOLDER}
            alt="Category image"
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onChoose}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {preview ? 'Change' : 'Upload'}
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MenuCategoriesTab() {
  const categoriesQuery = useCategoriesQuery();
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();
  const reorderMutation = useReorderCategoriesMutation();

  const categories = categoriesQuery.data?.categories ?? [];

  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('in_store');
  const [stockUnit, setStockUnit] = useState<StockUnit>('piece');
  // Minimum notice in hours ('' = none); see Settings > Ordering Rules.
  const [noticeHours, setNoticeHours] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categoryImage, setCategoryImage] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    imageUploading;

  const resetForm = () => {
    setName('');
    setType('in_store');
    setStockUnit('piece');
    setNoticeHours('');
    setEditingId(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    setCategoryImage(null);
    setRemoveImage(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
    e.target.value = '';
  };

  const handleCropDone = (blob: Blob) => {
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);

    const croppedFile = new File([blob], 'category-image.jpg', {
      type: 'image/jpeg'
    });
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(croppedFile));
    setImageFile(croppedFile);
  };

  const handleCropCancel = () => {
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    setCategoryImage(null);
    setRemoveImage(true);
  };

  const uploadImageIfNeeded = async (): Promise<
    string | null | undefined
  > => {
    if (removeImage) return null;
    if (imageFile) {
      setImageUploading(true);
      try {
        const {imageUrl} = await uploadCategoryImage(imageFile);
        return imageUrl;
      } finally {
        setImageUploading(false);
      }
    }
    return undefined;
  };

  const noticeValue = (): number | null => {
    const n = Number(noticeHours);
    return noticeHours.trim() === '' || !Number.isInteger(n) ? null : Math.min(72, n);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Enter a category name.');
      return;
    }
    try {
      const imageUrl = await uploadImageIfNeeded();
      createMutation.mutate(
        {
          name: name.trim(),
          type,
          stockUnit,
          imageUrl: imageUrl ?? undefined,
          minNoticeHours: noticeValue()
        },
        {
          onError: err =>
            toast.error(getFriendlyErrorMessage(err, 'Failed to add category')),
          onSuccess: () => {
            toast.success(`Category "${name.trim()}" added.`);
            resetForm();
          }
        }
      );
    } catch (err) {
      toast.error(
        getFriendlyErrorMessage(err, 'Failed to upload category image')
      );
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const imageUrl = await uploadImageIfNeeded();
      updateMutation.mutate(
        {id, body: {name: name.trim(), type, stockUnit, imageUrl, minNoticeHours: noticeValue()}},
        {
          onError: err =>
            toast.error(getFriendlyErrorMessage(err, 'Failed to update category')),
          onSuccess: () => {
            toast.success('Category updated.');
            resetForm();
          }
        }
      );
    } catch (err) {
      toast.error(
        getFriendlyErrorMessage(err, 'Failed to upload category image')
      );
    }
  };

  const handleDelete = (cat: Category) => {
    if (confirmingId !== cat._id) {
      setConfirmingId(cat._id);
      return;
    }
    deleteMutation.mutate(cat._id, {
      onError: err =>
        toast.error(getFriendlyErrorMessage(err, 'Failed to delete category')),
      onSuccess: () => {
        toast.success(`Category "${cat.name}" deleted.`);
        setConfirmingId(null);
      }
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map(c => c._id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderMutation.mutate(ids, {
      onError: err => toast.error(getFriendlyErrorMessage(err, 'Failed to save the menu order'))
    });
  };

  const toggleTopBar = (cat: Category) => {
    const next = !cat.showInTopBar;
    updateMutation.mutate(
      {id: cat._id, body: {showInTopBar: next}},
      {
        onError: err => toast.error(getFriendlyErrorMessage(err, 'Failed to update category')),
        onSuccess: () =>
          toast.success(next ? `"${cat.name}" now shows in the menu bar.` : `"${cat.name}" now only shows under Categories.`)
      }
    );
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat._id);
    setName(cat.name);
    setType(cat.type);
    setStockUnit(cat.stockUnit);
    setNoticeHours(cat.minNoticeHours != null ? String(cat.minNoticeHours) : '');
    setConfirmingId(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    setCategoryImage(cat.imageUrl ?? null);
    setRemoveImage(false);
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your category list is what Products use when adding or editing menu
          items. The chosen type decides whether Ingredient/Allergen tags apply,
          and the unit is locked to the category for stock tracking.
        </p>

        <div className="mt-5">
          {editingId ? (
            <div className="rounded-xl border border-[#2d4a35]/20 dark:border-[#7ed4a0]/30 bg-[#e9f5ee] dark:bg-[#1f3a2a]/50 p-4" onKeyDown={enterNavigation}>
              <p className="text-sm font-semibold text-[#2d4a35] dark:text-[#7ed4a0] mb-3">
                Edit category
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Field id="cat-name-edit" label="Name">
                  <Input
                    id="cat-name-edit"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Rice Meals"
                    disabled={isBusy}
                  />
                </Field>
                <Field id="cat-type-edit" label="Type">
                  <select
                    id="cat-type-edit"
                    value={type}
                    onChange={e => setType(e.target.value as CategoryType)}
                    disabled={isBusy}
                    className={selectClass}
                  >
                    {TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="cat-unit-edit" label="Stock unit">
                  <select
                    id="cat-unit-edit"
                    value={stockUnit}
                    onChange={e => setStockUnit(e.target.value as StockUnit)}
                    disabled={isBusy}
                    className={selectClass}
                  >
                    {UNIT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="cat-notice-edit" label="Min. notice (hours)">
                  <Input
                    id="cat-notice-edit"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={noticeHours}
                    onChange={e => setNoticeHours(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="None"
                    disabled={isBusy}
                    aria-describedby="cat-notice-hint-edit"
                  />
                  <p id="cat-notice-hint-edit" className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    e.g. 8 for lechon. Empty = no extra notice.
                  </p>
                </Field>
              </div>
              <div className="mt-4">
                <CategoryImagePicker
                  preview={imagePreview ?? categoryImage}
                  onChoose={() => fileInputRef.current?.click()}
                  onRemove={handleRemoveImage}
                  uploading={imageUploading}
                />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  type="button"
                  data-enter-submit
                  onClick={() => handleUpdate(editingId)}
                  disabled={isBusy}
                  className="bg-[#2d4a35] hover:bg-[#3c5e45] dark:text-white"
                >
                  {updateMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={isBusy}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-4" onKeyDown={enterNavigation}>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Field id="cat-name" label="New category name">
                  <Input
                    id="cat-name"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Rice Meals"
                    disabled={isBusy}
                  />
                </Field>
                <Field id="cat-type" label="Type">
                  <select
                    id="cat-type"
                    value={type}
                    onChange={e => setType(e.target.value as CategoryType)}
                    disabled={isBusy}
                    className={selectClass}
                  >
                    {TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="cat-unit" label="Stock unit (locked)">
                  <select
                    id="cat-unit"
                    value={stockUnit}
                    onChange={e => setStockUnit(e.target.value as StockUnit)}
                    disabled={isBusy}
                    className={selectClass}
                  >
                    {UNIT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="cat-notice" label="Min. notice (hours)">
                  <Input
                    id="cat-notice"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={noticeHours}
                    onChange={e => setNoticeHours(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="None"
                    disabled={isBusy}
                    aria-describedby="cat-notice-hint"
                  />
                  <p id="cat-notice-hint" className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    e.g. 8 for lechon. Empty = no extra notice.
                  </p>
                </Field>
              </div>
              <div className="mt-4">
                <CategoryImagePicker
                  preview={imagePreview}
                  onChoose={() => fileInputRef.current?.click()}
                  onRemove={handleRemoveImage}
                  uploading={imageUploading}
                />
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  data-enter-submit
                  onClick={handleCreate}
                  disabled={isBusy}
                  className="bg-[#2d4a35] hover:bg-[#3c5e45] dark:text-white"
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Current categories ({categories.length})
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          This is the order customers see on the menu. Use the arrows to move a
          category, and <span className="font-semibold">Top bar</span> to pin it
          as a tab above the menu (keep it to about 5). Every category is still
          listed in the menu&apos;s <span className="font-semibold">Categories</span>{' '}
          panel. Add-ons always show last. Promo items are not a section: they
          show under <span className="font-semibold">Promos</span> while active.
        </p>

        {categoriesQuery.isLoading ? (
          <div className="mt-3 space-y-2">
            {Array.from({length: 3}).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            No categories yet. Add your first one above.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-700">
            {categories.map((cat, index) => (
              <li
                key={cat._id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || reorderMutation.isPending}
                      aria-label={`Move ${cat.name} up`}
                      className="grid h-6 w-7 place-items-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === categories.length - 1 || reorderMutation.isPending}
                      aria-label={`Move ${cat.name} down`}
                      className="grid h-6 w-7 place-items-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                    <Image
                      src={cat.imageUrl || CATEGORY_PLACEHOLDER}
                      alt={cat.name}
                      width={64}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
                      {cat.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          cat.type === 'catering'
                            ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200'
                            : 'border-green-300 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300'
                        )}
                      >
                        {CATEGORY_TYPE_SHORT[cat.type]}
                      </span>
                      <span className="rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        {STOCK_UNIT_LABELS[cat.stockUnit]} ·{' '}
                        {STOCK_UNIT_HINTS[cat.stockUnit]}
                      </span>
                      {cat.minNoticeHours ? (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                          {cat.minNoticeHours} h notice
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {confirmingId === cat._id ? (
                  <div
                    role="group"
                    aria-label={`Confirm deleting ${cat.name}`}
                    className="flex shrink-0 items-center gap-1.5"
                  >
                    <span className="hidden text-xs font-semibold text-red-600 dark:text-red-400 sm:inline">
                      Delete?
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(cat)}
                      disabled={deleteMutation.isPending}
                      aria-label={`Confirm delete ${cat.name}`}
                      title="Confirm delete"
                      autoFocus
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmingId(null)}
                      disabled={deleteMutation.isPending}
                      aria-label={`Cancel deleting ${cat.name}`}
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {/^promos?$/i.test(cat.name.trim()) ? (
                      <span
                        className="inline-flex h-8 items-center rounded-full border border-dashed border-gray-200 px-2.5 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400"
                        title="Promo items show under the Promos tab while active and inside their dates"
                      >
                        Shown as Promos
                      </span>
                    ) : (
                    <button
                      type="button"
                      onClick={() => toggleTopBar(cat)}
                      disabled={isBusy}
                      aria-pressed={!!cat.showInTopBar}
                      title={cat.showInTopBar ? 'Shown as a tab above the menu' : 'Only listed in the Categories panel'}
                      className={cn(
                        'inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold transition-colors disabled:opacity-50',
                        cat.showInTopBar
                          ? 'border-[#2d4a35] bg-[#2d4a35] text-white dark:border-[#7ed4a0] dark:bg-[#7ed4a0] dark:text-[#1f3527]'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                      )}
                    >
                      <Pin className="h-3.5 w-3.5" aria-hidden />
                      Top bar
                    </button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(cat)}
                      disabled={isBusy}
                      aria-label={`Edit ${cat.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(cat)}
                      disabled={isBusy}
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Deleting a category is blocked while products still use it. Existing
          products keep whatever category text they were saved with.
        </p>
      </div>

      <ImageCropModal
        open={cropOpen}
        src={cropSrc ?? ''}
        aspect={16 / 9}
        onCancel={handleCropCancel}
        onCropDone={handleCropDone}
      />
    </div>
  );
}