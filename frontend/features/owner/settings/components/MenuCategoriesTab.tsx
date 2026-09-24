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
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import {cn} from '@/lib/utils';

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

const selectClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

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
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
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

  const categories = categoriesQuery.data?.categories ?? [];

  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('in_store');
  const [stockUnit, setStockUnit] = useState<StockUnit>('piece');
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

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Enter a category name.');
      return;
    }
    try {
      const imageUrl = await uploadImageIfNeeded();
      createMutation.mutate(
        {name: name.trim(), type, stockUnit, imageUrl: imageUrl ?? undefined},
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
        {id, body: {name: name.trim(), type, stockUnit, imageUrl}},
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

  const startEdit = (cat: Category) => {
    setEditingId(cat._id);
    setName(cat.name);
    setType(cat.type);
    setStockUnit(cat.stockUnit);
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
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#2d4a35]">Menu Categories</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your category list is what Products use when adding or editing menu
          items. The chosen type decides whether Ingredient/Allergen tags apply,
          and the unit is locked to the category for stock tracking.
        </p>

        <div className="mt-5">
          {editingId ? (
            <div className="rounded-xl border border-[#2d4a35]/20 bg-[#e9f5ee]/50 p-4">
              <p className="text-sm font-semibold text-[#2d4a35] mb-3">
                Edit category
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field id="cat-name-edit" label="Name">
                  <Input
                    id="cat-name-edit"
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
                  onClick={() => handleUpdate(editingId)}
                  disabled={isBusy}
                  className="bg-[#2d4a35] hover:bg-[#3c5e45]"
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
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field id="cat-name" label="New category name">
                  <Input
                    id="cat-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Rice Meals"
                    disabled={isBusy}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreate();
                      }
                    }}
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
                  onClick={handleCreate}
                  disabled={isBusy}
                  className="bg-[#2d4a35] hover:bg-[#3c5e45]"
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

      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h3 className="text-sm font-bold text-gray-900">
          Current categories ({categories.length})
        </h3>

        {categoriesQuery.isLoading ? (
          <div className="mt-3 space-y-2">
            {Array.from({length: 3}).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-gray-100"
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            No categories yet. Add your first one above.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {categories.map(cat => (
              <li
                key={cat._id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    <Image
                      src={cat.imageUrl || CATEGORY_PLACEHOLDER}
                      alt={cat.name}
                      width={64}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">
                      {cat.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          cat.type === 'catering'
                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                            : 'border-green-300 bg-green-50 text-green-700'
                        )}
                      >
                        {CATEGORY_TYPE_SHORT[cat.type]}
                      </span>
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase tracking-wide">
                        {STOCK_UNIT_LABELS[cat.stockUnit]} ·{' '}
                        {STOCK_UNIT_HINTS[cat.stockUnit]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
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
                    variant={confirmingId === cat._id ? 'destructive' : 'ghost'}
                    size="sm"
                    onClick={() => handleDelete(cat)}
                    disabled={isBusy}
                    aria-label={`Delete ${cat.name}`}
                  >
                    {deleteMutation.isPending && confirmingId === cat._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {confirmingId === cat._id && 'Confirm'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-gray-400">
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