'use client';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {type FormEvent} from 'react';
import type {CashierFormState} from '@/lib/types/cashiers';
import {Modal} from './Modal';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  form: CashierFormState;
  formError: string | null;
  submitStatus: 'idle' | 'submitting';
  isPending: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onFormChange: (
    field: keyof CashierFormState,
    value: string
  ) => void;
}

export function CashierFormModal({
  open,
  mode,
  form,
  formError,
  submitStatus,
  isPending,
  onClose,
  onSubmit,
  onFormChange
}: Props) {
  const isDisabled = submitStatus !== 'idle' || isPending;

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Add Cashier' : 'Edit Cashier'}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={e => onFormChange('firstName', e.target.value)}
              placeholder="e.g. Juan"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={e => onFormChange('lastName', e.target.value)}
              placeholder="e.g. Dela Cruz"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={e => onFormChange('email', e.target.value)}
              placeholder="e.g. juan@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={e => onFormChange('username', e.target.value)}
              placeholder="e.g. juan123"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">
              {mode === 'create' ? 'Password' : 'Password (optional)'}
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={e => onFormChange('password', e.target.value)}
              placeholder={
                mode === 'create'
                  ? 'Min. 8 characters'
                  : 'Leave blank to keep current'
              }
            />
            {mode === 'edit' && (
              <p className="text-[11px] text-gray-400">
                Leave blank to keep current password
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              value={form.phoneNumber}
              onChange={e => onFormChange('phoneNumber', e.target.value)}
              placeholder="e.g. 09171234567"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={form.address}
            onChange={e => onFormChange('address', e.target.value)}
            placeholder="e.g. 123 Lechon St."
          />
        </div>

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
            {submitStatus === 'submitting'
              ? 'Saving...'
              : mode === 'create'
              ? 'Save Cashier'
              : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
