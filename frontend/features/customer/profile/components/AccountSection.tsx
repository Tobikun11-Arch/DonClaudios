'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {useRouter} from 'next/navigation';
import {useChangePasswordMutation} from '@/lib/hooks/auth/useProfile';
import {useLogout} from '@/lib/hooks/auth/useLogout';
import {deleteAccount, downloadMyData} from '@/lib/api/authApi';
import type {MeUser} from '@/lib/api/authApi';

export function AccountSection({user}: {user: MeUser | undefined}) {
  const router = useRouter();
  const changePassword = useChangePasswordMutation();
  const logout = useLogout();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || newPassword.length < 6) {
      toast.error('Enter current password and a new one (6+ chars).');
      return;
    }
    try {
      await changePassword.mutateAsync({currentPassword, newPassword});
      toast.success('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      toast.error('Could not update password. Check current password.');
    }
  };

  const handleDownload = async () => {
    try {
      const data = await downloadMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download data.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your account and data? This cannot be undone.')) {
      return;
    }
    try {
      await deleteAccount();
      await logout.mutateAsync();
      router.replace('/sign-in');
    } catch {
      toast.error('Could not delete account.');
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
      <h2 className="text-lg font-bold text-foreground">Account</h2>

      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">Phone</p>
        <p className="text-foreground">{user?.phoneNumber ?? 'Not set'}</p>
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">Email</p>
        <p className="text-foreground">{user?.email ?? 'Not set'}</p>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground">Change password</p>
        <input
          type={showPw ? 'text' : 'password'}
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          className="min-h-[44px] w-full rounded-lg border border-border px-3 text-sm"
        />
        <input
          type={showPw ? 'text' : 'password'}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="New password (6+ chars)"
          className="min-h-[44px] w-full rounded-lg border border-border px-3 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="text-xs text-muted-foreground"
          >
            {showPw ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={changePassword.isPending}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-accent-warm px-4 text-sm font-semibold text-accent-warm-foreground disabled:opacity-60"
          >
            {changePassword.isPending ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-4 text-sm font-medium"
        >
          Download my data
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-destructive px-4 text-sm font-medium text-destructive"
        >
          Delete account
        </button>
      </div>
    </div>
  );
}
