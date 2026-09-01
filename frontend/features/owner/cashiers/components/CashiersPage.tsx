'use client';

import {
  useCashiersQuery,
  useCreateCashierMutation,
  useDeleteCashierMutation,
  useUpdateCashierMutation
} from '@/lib/hooks/cashiers/useCashiers';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {Users} from 'lucide-react';
import {type FormEvent, useMemo, useState} from 'react';
import {useCashierForm} from '../hooks/useCashierForm';
import {CashiersHeader} from './CashiersHeader';
import {CashiersFilters} from './CashiersFilters';
import {CashierCard, CashierCardSkeleton} from './CashierCard';
import {CashierFormModal} from './CashierFormModal';
import {DeleteCashierModal} from './DeleteCashierModal';
import type {Cashier} from '@/lib/types/cashier';
import {Button} from '@/components/ui/button';
import {Plus} from 'lucide-react';

export default function CashiersPage() {
  const cashiersQuery = useCashiersQuery();
  const createMutation = useCreateCashierMutation();
  const updateMutation = useUpdateCashierMutation();
  const deleteMutation = useDeleteCashierMutation();

  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCashier, setDeletingCashier] = useState<Cashier | null>(null);

  const {
    form,
    setForm,
    formError,
    setFormError,
    submitStatus,
    setSubmitStatus,
    resetForm,
    loadForm,
    validateAndGetPayload
  } = useCashierForm();

  const cashiers = useMemo(
    () => cashiersQuery.data?.cashiers ?? [],
    [cashiersQuery.data?.cashiers]
  );

  const visibleCashiers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cashiers
      .filter(c => {
        if (!q) return true;
        return (
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.username.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [cashiers, query]);

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (c: Cashier) => {
    setMode('edit');
    setEditingId(c._id);
    loadForm(c);
    setModalOpen(true);
  };

  const openDeleteModal = (c: Cashier) => {
    setDeletingCashier(c);
    setDeleteModalOpen(true);
  };

  const onCloseModal = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setModalOpen(false);
  };

  const onCloseDeleteModal = () => {
    if (deleteMutation.isPending) return;
    setDeleteModalOpen(false);
    setDeletingCashier(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const validated = validateAndGetPayload(mode);
    if (!validated) return;

    try {
      setSubmitStatus('submitting');

      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        address: form.address.trim() || undefined
      };

      if (mode === 'create') {
        await createMutation.mutateAsync(
          body as {
            firstName: string;
            lastName: string;
            email: string;
            password: string;
            username: string;
            phoneNumber?: string;
            address?: string;
          }
        );
      } else {
        if (!editingId) return;
        await updateMutation.mutateAsync({id: editingId, body});
      }

      setModalOpen(false);
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err, 'Failed to save cashier'));
    } finally {
      setSubmitStatus('idle');
    }
  };

  const onDelete = async () => {
    if (!deletingCashier) return;
    await deleteMutation.mutateAsync(deletingCashier._id);
    setDeleteModalOpen(false);
    setDeletingCashier(null);
  };

  return (
    <div className="space-y-5">
      <CashiersHeader
        showButton={visibleCashiers.length > 0}
        onAdd={openCreate}
      />

      <CashiersFilters query={query} onQueryChange={setQuery} />

      {cashiersQuery.isLoading && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 md:gap-5">
          {Array.from({length: 3}).map((_, i) => (
            <CashierCardSkeleton key={i} />
          ))}
        </div>
      )}

      {cashiersQuery.isError && (
        <div className="bg-white border border-red-200 rounded-2xl p-6 text-sm text-red-700">
          {getFriendlyErrorMessage(
            cashiersQuery.error,
            'Failed to load cashiers'
          )}
        </div>
      )}

      {!cashiersQuery.isLoading &&
        !cashiersQuery.isError &&
        (visibleCashiers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#e9f5ee] flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-[#2d4a35]" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              No cashiers yet
            </h3>
            <p className="text-sm text-gray-400 max-w-xs mb-6">
              Add your first cashier to manage store transactions.
            </p>
            <Button
              onClick={openCreate}
              className="bg-[#2d4a35] hover:bg-[#24402c] text-white text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Cashier
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 md:gap-5">
            {visibleCashiers.map(c => (
              <CashierCard
                key={c._id}
                cashier={c}
                onEdit={openEdit}
                onDelete={openDeleteModal}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        ))}

      <CashierFormModal
        open={modalOpen}
        mode={mode}
        form={form}
        formError={formError}
        submitStatus={submitStatus}
        isPending={createMutation.isPending || updateMutation.isPending}
        onClose={onCloseModal}
        onSubmit={onSubmit}
        onFormChange={(field, value) =>
          setForm(prev => ({...prev, [field]: value}))
        }
      />

      <DeleteCashierModal
        open={deleteModalOpen}
        cashierName={
          deletingCashier
            ? `${deletingCashier.firstName} ${deletingCashier.lastName}`
            : ''
        }
        isDeleting={deleteMutation.isPending}
        onConfirm={onDelete}
        onClose={onCloseDeleteModal}
      />
    </div>
  );
}
