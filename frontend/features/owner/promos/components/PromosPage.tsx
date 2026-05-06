'use client';

import {
  useCreatePromoMutation,
  useDeletePromoMutation,
  usePromosQuery,
  useUpdatePromoMutation
} from '@/lib/hooks/promos/usePromos';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {Tag} from 'lucide-react';
import {type FormEvent, useMemo, useState} from 'react';
import {usePromoForm} from '../hooks/usePromoForm';
import {PromosHeader} from './PromosHeader';
import {PromosFilters} from './PromosFilters';
import {PromoCard, PromoCardSkeleton} from './PromoCard';
import {PromoFormModal} from './PromoFormModal';
import {DeletePromoModal} from './DeletePromoModal';
import type {Promo} from '@/lib/types/promo';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';

export default function PromosPage() {
  const promosQuery = usePromosQuery();
  const productsQuery = useProductsQuery();
  const createMutation = useCreatePromoMutation();
  const updateMutation = useUpdatePromoMutation();
  const deleteMutation = useDeletePromoMutation();

  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPromo, setDeletingPromo] = useState<Promo | null>(null);

  const {
    form,
    setForm,
    formError,
    setFormError,
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
  } = usePromoForm();

  const promos = useMemo(
    () => promosQuery.data?.promos ?? [],
    [promosQuery.data?.promos]
  );

  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products]
  );

  const visiblePromos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return promos
      .filter(p => {
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const av = a.isActive ? 0 : 1;
        const bv = b.isActive ? 0 : 1;
        if (av !== bv) return av - bv;
        return a.title.localeCompare(b.title);
      });
  }, [promos, query]);

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (p: Promo) => {
    setMode('edit');
    setEditingId(p._id);
    loadForm({
      title: p.title,
      description: p.description,
      imageUrl: p.imageUrl,
      promoType: p.promoType,
      discountRate: p.discountRate,
      discountAmount: p.discountAmount,
      productIds: p.productIds,
      startDate: p.startDate,
      endDate: p.endDate,
      isActive: p.isActive
    });
    setModalOpen(true);
  };

  const openDelete = (p: Promo) => {
    setDeletingPromo(p);
    setDeleteModalOpen(true);
  };

  const closeFormModal = () => {
    setModalOpen(false);
    setSubmitStatus('idle');
    setFormError(null);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletingPromo(null);
  };

  const onFormChange = (
    field: keyof typeof form,
    value: string | boolean | string[]
  ) => {
    if (field === 'promoType' && typeof value === 'string') {
      setForm(prev => {
        const next = {
          ...prev,
          promoType: value as (typeof prev)['promoType']
        };

        if (value === 'percentage') {
          next.discountAmount = '';
        }

        if (value === 'fixed_amount') {
          next.discountRate = '';
        }

        if (value === 'bundle') {
          next.productIds = [];
        }

        return next;
      });
      return;
    }

    setForm(prev => ({...prev, [field]: value as (typeof prev)[typeof field]}));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validated = validateAndGetPayload(mode);
    if (!validated) return;

    try {
      setFormError(null);
      const imageUrl = await uploadImageIfNeeded();
      setSubmitStatus('submitting');

      const body = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        imageUrl,
        promoType: form.promoType,
        discountRate: validated.discountRate,
        discountAmount: validated.discountAmount,
        productIds: form.productIds,
        startDate: form.startDate,
        endDate: form.endDate,
        isActive: form.isActive
      };

      if (mode === 'create') {
        await createMutation.mutateAsync(body);
      } else {
        const id = editingId;
        if (!id) return;
        await updateMutation.mutateAsync({id, body});
      }

      setSubmitStatus('idle');
      setModalOpen(false);
      resetForm();
    } catch (err) {
      setSubmitStatus('idle');
      setFormError(getFriendlyErrorMessage(err, 'Something went wrong'));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPromo) return;
    try {
      await deleteMutation.mutateAsync(deletingPromo._id);
      closeDeleteModal();
    } catch {
      closeDeleteModal();
    }
  };

  return (
    <div className="space-y-6">
      <PromosHeader onCreate={openCreate} />

      <PromosFilters query={query} onQueryChange={setQuery} />

      {promosQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length: 6}).map((_, i) => (
            <PromoCardSkeleton key={i} />
          ))}
        </div>
      ) : promosQuery.isError ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-sm text-red-700">
          {getFriendlyErrorMessage(promosQuery.error, 'Failed to load promos')}
        </div>
      ) : visiblePromos.length === 0 ? (
        <div className="border border-gray-100 bg-white rounded-2xl p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center">
            <Tag className="h-6 w-6" />
          </div>
          <p className="mt-3 font-extrabold text-gray-900">No promos found</p>
          <p className="text-sm text-gray-500 mt-1">
            Create your first promo campaign.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visiblePromos.map(p => (
            <PromoCard
              key={p._id}
              promo={p}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

      <PromoFormModal
        open={modalOpen}
        mode={mode}
        form={form}
        formError={formError}
        previewUrl={previewUrl}
        isDragging={isDragging}
        submitStatus={submitStatus}
        isPending={createMutation.isPending || updateMutation.isPending}
        products={products}
        onClose={closeFormModal}
        onSubmit={handleSubmit}
        onFormChange={onFormChange}
        onFileChange={onFileChange}
        onDrop={onDrop}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
      />

      <DeletePromoModal
        open={deleteModalOpen}
        promoTitle={deletingPromo?.title ?? ''}
        isPending={deleteMutation.isPending}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
