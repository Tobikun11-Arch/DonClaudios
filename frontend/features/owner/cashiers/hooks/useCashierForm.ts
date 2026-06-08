import {useState} from 'react';
import type {CashierFormState} from '@/lib/types/cashiers';
import {emptyCashierForm} from '@/lib/types/cashiers';
import type {Cashier} from '@/lib/types/cashier';

export function useCashierForm() {
  const [form, setForm] = useState<CashierFormState>(emptyCashierForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'submitting'
  >('idle');

  const resetForm = () => {
    setForm(emptyCashierForm);
    setFormError(null);
    setSubmitStatus('idle');
  };

  const loadForm = (cashier: Cashier) => {
    setForm({
      firstName: cashier.firstName,
      lastName: cashier.lastName,
      email: cashier.email,
      username: cashier.username,
      password: '',
      phoneNumber: cashier.phoneNumber ?? '',
      address: cashier.address ?? ''
    });
    setFormError(null);
    setSubmitStatus('idle');
  };

  const validateAndGetPayload = (
    mode: 'create' | 'edit'
  ):
    | {
        price: undefined;
        stock: undefined;
      }
    | undefined => {
    if (!form.firstName.trim()) {
      setFormError('First name is required');
      return;
    }
    if (!form.lastName.trim()) {
      setFormError('Last name is required');
      return;
    }
    if (!form.email.trim()) {
      setFormError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('Invalid email format');
      return;
    }
    if (!form.username.trim()) {
      setFormError('Username is required');
      return;
    }
    if (form.username.trim().length < 3) {
      setFormError('Username must be at least 3 characters');
      return;
    }
    if (mode === 'create' && !form.password) {
      setFormError('Password is required');
      return;
    }
    if (mode === 'create' && form.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }
    if (form.password && form.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    return {price: undefined, stock: undefined};
  };

  return {
    form,
    setForm,
    formError,
    setFormError,
    submitStatus,
    setSubmitStatus,
    resetForm,
    loadForm,
    validateAndGetPayload
  };
}
