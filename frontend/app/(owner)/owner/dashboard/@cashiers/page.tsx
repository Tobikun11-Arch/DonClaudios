'use client';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  useCashiersQuery,
  useCreateCashierMutation,
  useDeleteCashierMutation,
  useUpdateCashierMutation
} from '@/lib/hooks/cashiers/useCashiers';
import type {Cashier} from '@/lib/types/cashier';
import {Edit, Plus, Search, Trash2, UserRound, Users} from 'lucide-react';
import {type FormEvent, useMemo, useState} from 'react';

type CashierForm = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phoneNumber: string;
  address: string;
  isVerified: boolean;
};

const emptyForm: CashierForm = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  phoneNumber: '',
  address: '',
  isVerified: true
};

export default function CashiersPage() {
  const cashiersQuery = useCashiersQuery();
  const createMutation = useCreateCashierMutation();
  const updateMutation = useUpdateCashierMutation();
  const deleteMutation = useDeleteCashierMutation();

  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingCashier, setDeletingCashier] = useState<Cashier | null>(null);
  const [form, setForm] = useState<CashierForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const cashiers = useMemo(
    () => cashiersQuery.data?.cashiers ?? [],
    [cashiersQuery.data?.cashiers]
  );

  const visibleCashiers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cashiers;
    return cashiers.filter(cashier =>
      [
        cashier.firstName,
        cashier.lastName,
        cashier.email,
        cashier.username,
        cashier.phoneNumber ?? '',
        cashier.address ?? ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [cashiers, query]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (cashier: Cashier) => {
    setMode('edit');
    setEditingId(cashier._id);
    setForm({
      firstName: cashier.firstName,
      lastName: cashier.lastName,
      email: cashier.email,
      username: cashier.username,
      password: '',
      phoneNumber: cashier.phoneNumber ?? '',
      address: cashier.address ?? '',
      isVerified: cashier.isVerified
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openDelete = (cashier: Cashier) => {
    setDeletingCashier(cashier);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.username.trim()
    ) {
      setFormError('First name, last name, email, and username are required.');
      return;
    }

    if (mode === 'create' && form.password.trim().length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    if (
      mode === 'edit' &&
      form.password.trim() &&
      form.password.trim().length < 8
    ) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          password: form.password.trim(),
          phoneNumber: form.phoneNumber.trim() || undefined,
          address: form.address.trim() || undefined
        });
      } else {
        if (!editingId) return;
        await updateMutation.mutateAsync({
          id: editingId,
          body: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            username: form.username.trim(),
            password: form.password.trim() || undefined,
            phoneNumber: form.phoneNumber.trim() || undefined,
            address: form.address.trim() || undefined,
            isVerified: form.isVerified
          }
        });
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error, 'Failed to save cashier'));
    }
  };

  const onDelete = async () => {
    if (!deletingCashier) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deletingCashier._id);
      setDeleteModalOpen(false);
      setDeletingCashier(null);
    } catch (error) {
      setDeleteError(
        getFriendlyErrorMessage(error, 'Failed to delete cashier')
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2d4a35]">
            Cashiers Management
          </h1>
          <p className="text-sm text-gray-500">
            Create and manage cashier accounts for the store.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#2d4a35] hover:bg-[#24402c]"
        >
          <Plus className="h-4 w-4" />
          Add Cashier
        </Button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search by name, email, username, phone, or address"
            className="pl-9"
          />
        </div>
      </div>

      {cashiersQuery.isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({length: 3}).map((_, index) => (
            <div
              key={index}
              className="h-44 bg-white border border-gray-100 rounded-2xl animate-pulse"
            />
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
              No cashiers found
            </h3>
            <p className="text-sm text-gray-400 max-w-xs mb-6">
              Add cashier accounts so staff can access the cashier dashboard.
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleCashiers.map(cashier => (
              <div
                key={cashier._id}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center shrink-0">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {cashier.firstName} {cashier.lastName}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      @{cashier.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {cashier.email}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      cashier.isOnline
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cashier.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs text-gray-500">
                  <div>
                    <span className="font-semibold text-gray-700">Phone:</span>{' '}
                    {cashier.phoneNumber || 'Not set'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">
                      Address:
                    </span>{' '}
                    {cashier.address || 'Not set'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">
                      Verified:
                    </span>{' '}
                    {cashier.isVerified ? 'Yes' : 'No'}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(cashier)}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => openDelete(cashier)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}

      {modalOpen && (
        <div className="fixed inset-0 z-100">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isSaving && setModalOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close modal"
          />
          <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <form
              onSubmit={onSubmit}
              className="w-full sm:max-w-2xl bg-white shadow-xl border border-gray-100 rounded-t-2xl sm:rounded-2xl h-full sm:h-auto flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {mode === 'create' ? 'Add Cashier' : 'Edit Cashier'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Fill out the account details then save.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cashier-first-name">First Name</Label>
                    <Input
                      id="cashier-first-name"
                      value={form.firstName}
                      onChange={event =>
                        setForm(value => ({
                          ...value,
                          firstName: event.target.value
                        }))
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashier-last-name">Last Name</Label>
                    <Input
                      id="cashier-last-name"
                      value={form.lastName}
                      onChange={event =>
                        setForm(value => ({
                          ...value,
                          lastName: event.target.value
                        }))
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashier-email">Email</Label>
                    <Input
                      id="cashier-email"
                      type="email"
                      value={form.email}
                      onChange={event =>
                        setForm(value => ({
                          ...value,
                          email: event.target.value
                        }))
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashier-username">Username</Label>
                    <Input
                      id="cashier-username"
                      value={form.username}
                      onChange={event =>
                        setForm(value => ({
                          ...value,
                          username: event.target.value
                        }))
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashier-password">
                      {mode === 'create' ? 'Password' : 'New Password'}
                    </Label>
                    <Input
                      id="cashier-password"
                      type="password"
                      value={form.password}
                      onChange={event =>
                        setForm(value => ({
                          ...value,
                          password: event.target.value
                        }))
                      }
                      placeholder={
                        mode === 'edit'
                          ? 'Leave blank to keep current password'
                          : ''
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashier-phone">Phone Number</Label>
                    <Input
                      id="cashier-phone"
                      value={form.phoneNumber}
                      onChange={event =>
                        setForm(value => ({
                          ...value,
                          phoneNumber: event.target.value
                        }))
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="cashier-address">Address</Label>
                    <Input
                      id="cashier-address"
                      value={form.address}
                      onChange={event =>
                        setForm(value => ({
                          ...value,
                          address: event.target.value
                        }))
                      }
                      disabled={isSaving}
                    />
                  </div>
                  {mode === 'edit' && (
                    <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.isVerified}
                        onChange={event =>
                          setForm(value => ({
                            ...value,
                            isVerified: event.target.checked
                          }))
                        }
                        disabled={isSaving}
                      />
                      Verified account
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#2d4a35] hover:bg-[#24402c]"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving…' : 'Save Cashier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalOpen && deletingCashier && (
        <div className="fixed inset-0 z-100">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              !deleteMutation.isPending && setDeleteModalOpen(false)
            }
            role="button"
            tabIndex={0}
            aria-label="Close delete modal"
          />
          <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="w-full sm:max-w-md bg-white shadow-xl border border-gray-100 rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Delete "{deletingCashier.firstName} {deletingCashier.lastName}
                  "
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  Are you sure you want to delete this cashier account? This
                  cannot be undone.
                </p>
              </div>
              {deleteError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {deleteError}
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete Cashier'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
