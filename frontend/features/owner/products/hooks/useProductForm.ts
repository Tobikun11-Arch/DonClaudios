import {uploadProductImage} from '@/lib/api/uploadApi';
import {
  isCateringCategory,
  getCategoryByName
} from '@/lib/categories/categoryUtils';
import {emptyProductForm, type ProductFormState} from '@/lib/types/products';
import {type Category} from '@/lib/types/category';
import {
  type Product,
  type ProductAllergen,
  type ProductIngredient
} from '@/lib/types/product';
import {
  isPreOrderCategory,
  toDeadlineInputValue,
  todayInStoreTimezone
} from '@/lib/preOrder/preOrder';
import {type DragEvent, useEffect, useState} from 'react';

/** Most batch windows an owner can define; the API accepts up to 7. */
export const MAX_PRE_ORDER_BATCHES = 4;

const EMPTY_BATCH = {startTime: '', endTime: '', stock: ''};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Promo dates are stored as Date instants and come back from the API as full
 * ISO strings, but <input type="date"> only renders a `YYYY-MM-DD` value —
 * anything else silently shows blank. Convert back so re-opening the edit
 * form reflects the days the owner actually saved. The stored instant was
 * built from `new Date("YYYY-MM-DD")` (UTC midnight), so its UTC day is the
 * original pick.
 */
function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function useProductForm(categories: Category[] = []) {
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'uploading' | 'submitting'
  >('idle');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetForm = () => {
    setForm(emptyProductForm);
    setFormError(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setSubmitStatus('idle');
  };

  const loadForm = (data: Product) => {
    setForm({
      name: data.name ?? '',
      category: data.category ?? '',
      price: String(data.price ?? ''),
      stock: String(data.stock ?? ''),
      description: data.description ?? '',
      imageUrl: data.imageUrl ?? '',
      prepTimeMinutes:
        data.prepTimeMinutes == null ? '' : String(data.prepTimeMinutes),
      ingredients: data.ingredients ?? [],
      allergens: data.allergens ?? [],
      isAvailable: data.isAvailable ?? true,
      pointsCost:
        data.pointsCost == null ? '' : String(data.pointsCost),
      promoType: data.promoType ?? 'percentage',
      discountRate: data.discountRate == null ? '' : String(data.discountRate),
      discountAmount:
        data.discountAmount == null ? '' : String(data.discountAmount),
      promoStartDate: toDateInputValue(data.promoStartDate),
      promoEndDate: toDateInputValue(data.promoEndDate),
      isPromoActive: data.isPromoActive ?? true,
      // Existing products default to no pre-order; only honour the stored
      // values if the product is still in an eligible category.
      isPreOrder:
        data.isPreOrder === true && isPreOrderCategory(data.category)
          ? 'yes'
          : 'no',
      preOrderPurchaseLimit:
        data.preOrderPurchaseLimit == null
          ? ''
          : String(data.preOrderPurchaseLimit),
      preOrderDeadline: toDeadlineInputValue(data.preOrderDeadline),
      // Load the stored schedule so editing shows the windows the owner
      // already set. A legacy pre-order (saved before batches) starts with
      // one blank window to fill in.
      preOrderBatchCount:
        Array.isArray(data.preOrderBatches) && data.preOrderBatches.length > 0
          ? String(data.preOrderBatches.length)
          : '1',
      preOrderBatches:
        Array.isArray(data.preOrderBatches) && data.preOrderBatches.length > 0
          ? data.preOrderBatches.map(b => ({
              startTime: b.startTime,
              endTime: b.endTime,
              stock: String(b.stock)
            }))
          : [{...EMPTY_BATCH}]
    });
    setPreviewUrl(data.imageUrl ?? null);
    setFormError(null);
    setSelectedFile(null);
  };

  /** Can the currently selected category be turned into a pre-order? */
  const canUsePreOrder = isPreOrderCategory(form.category);
  const isPreOrderOn = canUsePreOrder && form.isPreOrder === 'yes';

  /**
   * Pick a category. If the new category does not support pre-order, the
   * pre-order fields are cleared so a stale limit/deadline can never be
   * submitted by accident.
   */
  const setCategory = (category: string) => {
    setForm(prev =>
      isPreOrderCategory(category)
        ? {...prev, category}
        : {
            ...prev,
            category,
            isPreOrder: 'no',
            preOrderPurchaseLimit: '',
            preOrderDeadline: '',
            preOrderBatchCount: '1',
            preOrderBatches: [{...EMPTY_BATCH}]
          }
    );
  };

  /** Toggle pre-order on/off. Turning it off clears the extra fields. */
  const setIsPreOrder = (value: 'yes' | 'no') => {
    setForm(prev =>
      value === 'yes'
        ? {...prev, isPreOrder: 'yes'}
        : {
            ...prev,
            isPreOrder: 'no',
            preOrderPurchaseLimit: '',
            preOrderDeadline: '',
            preOrderBatchCount: '1',
            preOrderBatches: [{...EMPTY_BATCH}]
          }
    );
  };

  /**
   * Change how many batch windows exist. Rows the owner already typed are
   * kept; new rows start blank.
   */
  const setBatchCount = (count: number) => {
    const next = Math.min(Math.max(1, count), MAX_PRE_ORDER_BATCHES);
    setForm(prev => {
      const rows = [...prev.preOrderBatches];
      while (rows.length < next) rows.push({...EMPTY_BATCH});
      return {
        ...prev,
        preOrderBatchCount: String(next),
        preOrderBatches: rows.slice(0, next)
      };
    });
  };

  /** Edit one field of one batch window. */
  const updateBatch = (
    index: number,
    field: 'startTime' | 'endTime' | 'stock',
    value: string
  ) => {
    setForm(prev => {
      const rows = prev.preOrderBatches.map((row, i) =>
        i === index ? {...row, [field]: value} : row
      );
      return {...prev, preOrderBatches: rows};
    });
  };

  const handleIncomingFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image must be under 5MB.');
      return;
    }
    setFormError(null);
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleIncomingFile(file);
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleIncomingFile(file);
  };

  const validateAndGetPayload = (mode: 'create' | 'edit') => {
    const price = Number(form.price);
    let stock = Number(form.stock);
    const prepTime = form.prepTimeMinutes.trim();
    const prepTimeMinutes = prepTime === '' ? null : Number(prepTime);
    const pointsCostStr = form.pointsCost.trim();
    const pointsCost = pointsCostStr === '' ? null : Number(pointsCostStr);
    const isPromoCategory = form.category.toLowerCase() === 'promo';

    // Promo field validation
    let promoType: 'percentage' | 'fixed_amount' | 'bundle' | undefined;
    let discountRate: number | undefined;
    let discountAmount: number | undefined;
    let promoStartDate: string | undefined;
    let promoEndDate: string | undefined;
    let isPromoActive: boolean | undefined;

    if (isPromoCategory) {
      promoType = form.promoType;
      if (promoType === 'percentage') {
        const dr = Number(form.discountRate);
        if (
          form.discountRate.trim() === '' ||
          Number.isNaN(dr) ||
          dr < 0 ||
          dr > 100
        ) {
          setFormError('Discount rate must be between 0 and 100');
          return null;
        }
        discountRate = dr;
      } else if (promoType === 'fixed_amount') {
        const da = Number(form.discountAmount);
        if (form.discountAmount.trim() === '' || Number.isNaN(da) || da < 0) {
          setFormError('Discount amount must be a valid number');
          return null;
        }
        discountAmount = da;
      }
      // Bundle type doesn't need discount fields

      if (form.promoStartDate.trim()) {
        promoStartDate = form.promoStartDate;
      }
      if (form.promoEndDate.trim()) {
        promoEndDate = form.promoEndDate;
      }
      isPromoActive = form.isPromoActive;
    }

    if (prepTimeMinutes !== null) {
      if (!Number.isInteger(prepTimeMinutes) || prepTimeMinutes < 0) {
        setFormError('Prep time is invalid');
        return null;
      }
      if (prepTimeMinutes > 1440) {
        setFormError('Prep time must be 1440 minutes (24 hours) or less');
        return null;
      }
    }
    if (pointsCost !== null) {
      if (!Number.isInteger(pointsCost) || pointsCost < 0) {
        setFormError('Reward points cost is invalid');
        return null;
      }
    }
    if (!form.name.trim()) {
      setFormError('Name is required');
      return null;
    }
    if (!form.category.trim()) {
      setFormError('Category is required');
      return null;
    }
    if (!getCategoryByName(categories, form.category)) {
      setFormError('Pick a category from the list before saving.');
      return null;
    }
    if (Number.isNaN(price) || price < 0) {
      setFormError('Price is invalid');
      return null;
    }
    if (mode === 'create' && !selectedFile) {
      setFormError('Please select a product image before saving.');
      return null;
    }
    const isBulkCategory = isCateringCategory(categories, form.category);
    if (!isBulkCategory && !isPromoCategory && form.ingredients.length === 0) {
      setFormError('Add at least 1 ingredient.');
      return null;
    }

    // Pre-order: only ever sent for an eligible category, and never as a
    // half-filled state. When off we send explicit nulls so the backend
    // clears any previously stored limit/deadline/batches.
    let isPreOrder = false;
    let preOrderPurchaseLimit: number | null = null;
    let preOrderDeadline: string | null = null;
    let preOrderBatches: Array<{
      startTime: string;
      endTime: string;
      stock: number;
    }> | null = null;

    if (canUsePreOrder && form.isPreOrder === 'yes') {
      const limitRaw = form.preOrderPurchaseLimit.trim();
      const limit = Number(limitRaw);
      if (
        limitRaw === '' ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 999
      ) {
        setFormError(
          'Purchase limit per batch must be a whole number greater than zero.'
        );
        return null;
      }

      const deadline = form.preOrderDeadline.trim();
      if (!deadline) {
        setFormError('Pre-order date is required.');
        return null;
      }
      if (deadline < todayInStoreTimezone()) {
        setFormError('Pre-order date cannot be in the past.');
        return null;
      }

      // Batch windows: every selected row needs a real time range and a
      // positive stock pool. The API re-checks all of this, but catching it
      // here keeps the owner from losing the rest of the form.
      const count = Number(form.preOrderBatchCount);
      if (!Number.isInteger(count) || count < 1 || count > MAX_PRE_ORDER_BATCHES) {
        setFormError('Pick how many batches to run.');
        return null;
      }

      const rows = form.preOrderBatches.slice(0, count);
      if (rows.length !== count) {
        setFormError('Fill in every batch window.');
        return null;
      }

      const parsed: Array<{
        startTime: string;
        endTime: string;
        stock: number;
      }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const startTime = row.startTime.trim();
        const endTime = row.endTime.trim();
        const label = `Batch ${i + 1}`;

        if (!startTime || !endTime) {
          setFormError(`${label}: start and end time are required.`);
          return null;
        }
        if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
          setFormError(`${label}: times must be in HH:MM format.`);
          return null;
        }
        if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
          setFormError(`${label}: end time must be after the start time.`);
          return null;
        }

        const batchStockRaw = row.stock.trim();
        const batchStock = Number(batchStockRaw);
        if (
          batchStockRaw === '' ||
          !Number.isInteger(batchStock) ||
          batchStock < 1 ||
          batchStock > 9999
        ) {
          setFormError(
            `${label}: stock must be a whole number greater than zero.`
          );
          return null;
        }

        parsed.push({startTime, endTime, stock: batchStock});
      }

      // Windows must not overlap, in the order they actually run rather
      // than the order they were typed.
      const chronological = [...parsed].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );
      for (let i = 1; i < chronological.length; i++) {
        const prev = chronological[i - 1];
        const next = chronological[i];
        if (timeToMinutes(next.startTime) < timeToMinutes(prev.endTime)) {
          setFormError(
            `Batch windows cannot overlap — ${next.startTime} starts before the ${prev.endTime} batch ends.`
          );
          return null;
        }
      }

      isPreOrder = true;
      preOrderPurchaseLimit = limit;
      // Sent as YYYY-MM-DD; the backend turns it into the end-of-day instant.
      preOrderDeadline = deadline;
      preOrderBatches = parsed;
      // Stock is owned by the batches, so the manual field is bypassed.
      stock = parsed.reduce((sum, b) => sum + b.stock, 0);
    }

    if (preOrderBatches === null && (!Number.isInteger(stock) || stock < 0)) {
      setFormError('Stock is invalid');
      return null;
    }

    return {
      price,
      stock,
      prepTimeMinutes,
      ingredients: form.ingredients,
      allergens: form.allergens,
      isBulkCategory,
      pointsCost,
      promoType,
      discountRate,
      discountAmount,
      promoStartDate,
      promoEndDate,
      isPromoActive,
      isPreOrder,
      preOrderPurchaseLimit,
      preOrderDeadline,
      preOrderBatches
    } as {
      price: number;
      stock: number;
      prepTimeMinutes: number | null;
      ingredients: ProductIngredient[];
      allergens: ProductAllergen[];
      isBulkCategory: boolean;
      pointsCost: number | null;
      promoType?: 'percentage' | 'fixed_amount' | 'bundle';
      discountRate?: number;
      discountAmount?: number;
      promoStartDate?: string;
      promoEndDate?: string;
      isPromoActive?: boolean;
      isPreOrder: boolean;
      preOrderPurchaseLimit: number | null;
      preOrderDeadline: string | null;
      preOrderBatches: Array<{
        startTime: string;
        endTime: string;
        stock: number;
      }> | null;
    };
  };

  const uploadImageIfNeeded = async (): Promise<string | undefined> => {
    if (!selectedFile) return form.imageUrl.trim() || undefined;
    setSubmitStatus('uploading');
    const uploaded = await uploadProductImage(selectedFile);
    return uploaded.imageUrl;
  };

  return {
    form,
    setForm,
    formError,
    setFormError,
    selectedFile,
    previewUrl,
    isDragging,
    setIsDragging,
    submitStatus,
    setSubmitStatus,
    resetForm,
    loadForm,
    setCategory,
    setIsPreOrder,
    setBatchCount,
    updateBatch,
    canUsePreOrder,
    isPreOrderOn,
    onFileChange,
    onDrop,
    validateAndGetPayload,
    uploadImageIfNeeded
  };
}
