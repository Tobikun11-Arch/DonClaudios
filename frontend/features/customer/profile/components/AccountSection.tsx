'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {toast} from 'sonner';
import {useRouter} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  X
} from 'lucide-react';
import {useChangePasswordMutation} from '@/lib/hooks/auth/useProfile';
import {deleteAccount, downloadMyData} from '@/lib/api/authApi';
import type {MeUser} from '@/lib/api/authApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {validatePassword} from '@/lib/utils/passwordRules';
import PasswordStrengthChecklist from '@/components/PasswordStrengthChecklist';
import {Z} from '@/lib/zIndex';

const inputClass =
  'min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3c5e45] focus:outline-none focus:ring-2 focus:ring-[#3c5e45]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-[#7ed4a0] dark:focus:ring-[#7ed4a0]/20';

const primaryButton =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#3c5e45] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2d4a35] disabled:cursor-not-allowed disabled:opacity-60';

const outlineButton =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#3c5e45]/40 px-4 text-sm font-semibold text-[#2d4a35] transition-colors hover:bg-[#e9f5ee] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#7ed4a0]/40 dark:text-[#7ed4a0] dark:hover:bg-[#7ed4a0]/10';

const dangerOutlineButton =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10';

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  visible
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  visible: boolean;
}) {
  return (
    <input
      id={id}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={inputClass}
    />
  );
}

function ChangePasswordForm({email}: {email?: string}) {
  const changePassword = useChangePasswordMutation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Fill in your current password, a new password, and confirm it.');
      return;
    }
    // Same rules the server enforces, so a weak password is caught here with
    // a clear reason.
    const {valid, unmet} = validatePassword(newPassword);
    if (!valid) {
      setError(`New password needs: ${unmet.join(', ').toLowerCase()}.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Your new password must be different from your current one.');
      return;
    }

    try {
      await changePassword.mutateAsync({currentPassword, newPassword});
      toast.success('Password updated. Other devices have been signed out.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPw(false);
    } catch (err) {
      setError(
        getFriendlyErrorMessage(err, 'Could not update password. Check your current password.')
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {/* Lets password managers save the new password against this account. */}
      <input type="hidden" name="username" autoComplete="username" value={email ?? ''} readOnly />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Change password
        </p>
        <button
          type="button"
          onClick={() => setShowPw(v => !v)}
          aria-pressed={showPw}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-[#3c5e45] hover:bg-[#e9f5ee] dark:text-[#7ed4a0] dark:hover:bg-[#7ed4a0]/10"
        >
          {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showPw ? 'Hide' : 'Show'}
        </button>
      </div>

      <label htmlFor="current-password" className="sr-only">
        Current password
      </label>
      <PasswordInput
        id="current-password"
        value={currentPassword}
        onChange={setCurrentPassword}
        placeholder="Current password"
        autoComplete="current-password"
        visible={showPw}
      />

      <div>
        <label htmlFor="new-password" className="sr-only">
          New password
        </label>
        <PasswordInput
          id="new-password"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="New password"
          autoComplete="new-password"
          visible={showPw}
        />
        <PasswordStrengthChecklist value={newPassword} />
      </div>

      <div>
        <label htmlFor="confirm-password" className="sr-only">
          Confirm new password
        </label>
        <PasswordInput
          id="confirm-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirm new password"
          autoComplete="new-password"
          visible={showPw}
        />
        {mismatch && (
          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
            Passwords do not match.
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={changePassword.isPending} className={primaryButton}>
        {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {changePassword.isPending ? 'Updating…' : 'Update password'}
      </button>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        For your security, changing your password signs you out on every other
        device and we email you a notice.
      </p>
    </form>
  );
}

function DeleteAccountDialog({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isDeleting, onClose]);

  if (!open) return null;

  const canDelete = password.length > 0 && confirmText === 'DELETE' && !isDeleting;

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    if (!canDelete) return;
    setError(null);
    setIsDeleting(true);
    try {
      await deleteAccount({password, confirmation: 'DELETE'});
      // The server already cleared the session cookies; drop every cached
      // query so nothing from the deleted account lingers in memory.
      queryClient.clear();
      toast.success('Your account has been deleted.');
      router.replace('/sign-in');
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not delete your account. Try again.'));
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 ${Z.globalModal} flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6 dark:bg-black/70`}
      onClick={() => !isDeleting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-gray-100 bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h3
              id="delete-account-title"
              className="text-base font-bold text-gray-900 dark:text-gray-100"
            >
              Delete your account?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <p>This is permanent and cannot be undone. We will:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Delete your profile, saved addresses, occasions and preferences</li>
            <li>Delete your cart, notifications and reward points</li>
            <li>
              Keep past orders only as anonymous sales records (required for the
              store&apos;s accounting)
            </li>
            <li>Sign you out everywhere and email you a confirmation</li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Want a copy first? Use “Download my data” before deleting.
          </p>
        </div>

        <form onSubmit={handleDelete} className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="delete-password"
              className="text-xs font-semibold text-gray-700 dark:text-gray-300"
            >
              Enter your password
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputClass}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="delete-confirm"
              className="text-xs font-semibold text-gray-700 dark:text-gray-300"
            >
              Type <span className="font-mono font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={inputClass}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canDelete}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isDeleting ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AccountSection({user}: {user: MeUser | undefined}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const data = await downloadMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `donclaudios-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser a moment to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Your data was downloaded.');
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Could not download your data.'));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-lg font-bold text-[#2d4a35] dark:text-[#7ed4a0]">Account</h2>

      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-gray-500 dark:text-gray-400">Phone</p>
          <p className="text-gray-900 dark:text-gray-100">{user?.phoneNumber || 'Not set'}</p>
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-gray-500 dark:text-gray-400">Email</p>
          <p className="truncate text-gray-900 dark:text-gray-100">{user?.email || 'Not set'}</p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        <ChangePasswordForm email={user?.email} />
      </div>

      <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Your data</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Download a copy of your profile, orders, reviews and rewards as a
            JSON file, or permanently delete your account.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className={outlineButton}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isDownloading ? 'Preparing…' : 'Download my data'}
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className={dangerOutlineButton}
          >
            <Trash2 className="h-4 w-4" />
            Delete account
          </button>
        </div>
      </div>

      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
