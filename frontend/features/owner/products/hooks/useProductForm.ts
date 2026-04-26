import {uploadProductImage} from '@/lib/api/uploadApi';
import {emptyProductForm, type ProductFormState} from '@/lib/types/products';
import {type DragEvent, useEffect, useState} from 'react';
import {Product} from '@/lib/types/product';

export function useProductForm() {
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
      isAvailable: data.isAvailable ?? true
    });
    setPreviewUrl(data.imageUrl ?? null);
    setFormError(null);
    setSelectedFile(null);
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
    if (!form.name.trim()) {
      setFormError('Name is required');
      return null;
    }
    if (!form.category.trim()) {
      setFormError('Category is required');
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
    return {price, stock};
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
    onFileChange,
    onDrop,
    validateAndGetPayload,
    uploadImageIfNeeded
  };
}
