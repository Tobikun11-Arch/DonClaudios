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
      promoStartDate: data.promoStartDate ?? '',
      promoEndDate: data.promoEndDate ?? '',
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
      preOrderDeadline: toDeadlineInputValue(data.preOrderDeadline)
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
            preOrderDeadline: ''
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
            preOrderDeadline: ''
          }
    );
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
    const stock = Number(form.stock);
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
    if (!Number.isInteger(stock) || stock < 0) {
      setFormError('Stock is invalid');
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
    // clears any previously stored limit/deadline.
    let isPreOrder = false;
    let preOrderPurchaseLimit: number | null = null;
    let preOrderDeadline: string | null = null;

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
          'Purchase limit must be a whole number greater than zero.'
        );
        return null;
      }

      const deadline = form.preOrderDeadline.trim();
      if (!deadline) {
        setFormError('Pre-order deadline is required.');
        return null;
      }
      if (deadline < todayInStoreTimezone()) {
        setFormError('Pre-order deadline cannot be in the past.');
        return null;
      }

      isPreOrder = true;
      preOrderPurchaseLimit = limit;
      // Sent as YYYY-MM-DD; the backend turns it into the end-of-day instant.
      preOrderDeadline = deadline;
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
      preOrderDeadline
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
    canUsePreOrder,
    isPreOrderOn,
    onFileChange,
    onDrop,
    validateAndGetPayload,
    uploadImageIfNeeded
  };
}
