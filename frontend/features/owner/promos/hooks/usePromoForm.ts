'use client';

import {useMemo, useState} from 'react';
import {emptyPromoForm, type PromoFormState} from '@/lib/types/promos';
import {uploadPromoImage} from '@/lib/api/uploadApi';

export function usePromoForm() {
  const [form, setForm] = useState<PromoFormState>(emptyPromoForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'uploading' | 'submitting'
  >('idle');

  const previewUrl = useMemo(() => {
    if (selectedFile) return URL.createObjectURL(selectedFile);
    const url = form.imageUrl.trim();
    return url.length > 0 ? url : null;
  }, [form.imageUrl, selectedFile]);

  const resetForm = () => {
    setForm(emptyPromoForm);
    setFormError(null);
    setSelectedFile(null);
    setIsDragging(false);
    setSubmitStatus('idle');
  };

  const loadForm = (p: {
    title: string;
    description?: string;
    imageUrl?: string;
    promoType: 'percentage' | 'fixed_amount' | 'bundle';
    price?: number;
    discountRate?: number;
    discountAmount?: number;
    productIds?: string[];
    startDate: string;
    endDate: string;
    isActive: boolean;
  }) => {
    setForm({
      title: p.title ?? '',
      description: p.description ?? '',
      imageUrl: p.imageUrl ?? '',
      promoType: p.promoType ?? 'percentage',
      price: String(p.price ?? ''),
      discountRate: String(p.discountRate ?? ''),
      discountAmount: String(p.discountAmount ?? ''),
      productIds: p.productIds ?? [],
      startDate: (p.startDate ?? '').slice(0, 10),
      endDate: (p.endDate ?? '').slice(0, 10),
      isActive: Boolean(p.isActive)
    });
    setFormError(null);
    setSelectedFile(null);
    setIsDragging(false);
    setSubmitStatus('idle');
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
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) handleIncomingFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) handleIncomingFile(file);
  };

  const validateAndGetPayload = (mode: 'create' | 'edit') => {
    const price = form.price.trim().length ? Number(form.price) : undefined;
    const discountRate = form.discountRate.trim().length
      ? Number(form.discountRate)
      : undefined;
    const discountAmount = form.discountAmount.trim().length
      ? Number(form.discountAmount)
      : undefined;

    if (!form.title.trim()) {
      setFormError('Title is required');
      return null;
    }

    if (
      typeof discountRate === 'number' &&
      (Number.isNaN(discountRate) || discountRate < 0)
    ) {
      setFormError('Discount rate is invalid');
      return null;
    }

    if (
      typeof discountAmount === 'number' &&
      (Number.isNaN(discountAmount) || discountAmount < 0)
    ) {
      setFormError('Discount amount is invalid');
      return null;
    }

    if (typeof price === 'number' && (Number.isNaN(price) || price < 0)) {
      setFormError('Price is invalid');
      return null;
    }

    if (!form.startDate) {
      setFormError('Start date is required');
      return null;
    }

    if (!form.endDate) {
      setFormError('End date is required');
      return null;
    }

    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) {
      setFormError('End date must be after start date');
      return null;
    }

    const productCount = form.productIds.length;

    if (form.promoType === 'percentage') {
      if (typeof discountRate !== 'number') {
        setFormError('Discount rate is required');
        return null;
      }
      if (typeof discountAmount === 'number') {
        setFormError('Discount amount must be blank');
        return null;
      }
      if (productCount < 1) {
        setFormError('Please select at least 1 product');
        return null;
      }
    }

    if (form.promoType === 'bundle') {
      if (typeof price !== 'number') {
        setFormError('Price is required');
        return null;
      }
      if (typeof discountRate === 'number') {
        setFormError('Discount rate must be blank');
        return null;
      }
      if (typeof discountAmount === 'number') {
        setFormError('Discount amount must be blank');
        return null;
      }
      if (productCount < 1) {
        setFormError('Please select at least 1 product');
        return null;
      }
    }

    if (form.promoType === 'fixed_amount') {
      if (typeof discountAmount !== 'number') {
        setFormError('Discount amount is required');
        return null;
      }
      if (typeof discountRate === 'number') {
        setFormError('Discount rate must be blank');
        return null;
      }
      if (productCount < 1) {
        setFormError('Please select at least 1 product');
        return null;
      }
    }

    if (mode === 'create' && !selectedFile && !form.imageUrl.trim()) {
      setFormError('Please select a promo image before saving.');
      return null;
    }

    return {price, discountRate, discountAmount};
  };

  const uploadImageIfNeeded = async (): Promise<string | undefined> => {
    if (!selectedFile) return form.imageUrl.trim() || undefined;
    setSubmitStatus('uploading');
    const uploaded = await uploadPromoImage(selectedFile);
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
    onFileChange,
    onDrop,
    validateAndGetPayload,
    uploadImageIfNeeded
  };
}
