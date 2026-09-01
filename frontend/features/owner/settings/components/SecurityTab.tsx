'use client';

import {useState, type FormEvent} from 'react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card, CardContent} from '@/components/ui/card';
import {useChangePasswordMutation, useSessionsQuery} from '@/lib/hooks/auth/useProfile';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {Monitor} from 'lucide-react';

function PasswordField({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

export function SecurityTab() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  const changePasswordMutation = useChangePasswordMutation();
  const sessionsQuery = useSessionsQuery();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.currentPassword) {
      setFormError('Please enter your current password.');
      return;
    }
    if (form.newPassword.length < 8) {
      setFormError('New password must be at least 8 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setFormError('New password and confirmation do not match.');
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      toast.success('Password updated.');
      setForm({currentPassword: '', newPassword: '', confirmPassword: ''});
    } catch (err) {
      setFormError(
        getFriendlyErrorMessage(err, 'Failed to update password')
      );
    }
  };

  const isBusy = changePasswordMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="border-gray-100 p-0">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-[#2d4a35] mb-4">
            Change Password
          </h2>

          <form onSubmit={onSubmit} className="space-y-4">
            <PasswordField
              id="currentPassword"
              label="Current password"
              value={form.currentPassword}
              onChange={v =>
                setForm(f => ({...f, currentPassword: v}))
              }
            />
            <PasswordField
              id="newPassword"
              label="New password"
              value={form.newPassword}
              onChange={v => setForm(f => ({...f, newPassword: v}))}
            />
            <PasswordField
              id="confirmPassword"
              label="Confirm new password"
              value={form.confirmPassword}
              onChange={v => setForm(f => ({...f, confirmPassword: v}))}
            />

            {formError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {formError}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isBusy}
                className="bg-[#2d4a35] hover:bg-[#24402c]"
              >
                {isBusy ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-gray-100 p-0">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-[#2d4a35] mb-4">
            Login Activity
          </h2>

          {sessionsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({length: 2}).map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-gray-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : sessionsQuery.isError ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              Failed to load active sessions.
            </div>
          ) : (
            <div className="space-y-2">
              {(sessionsQuery.data?.sessions ?? []).map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-full bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center shrink-0">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {s.device}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {s.location}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">
                      {new Date(s.lastActive).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}

              <div className="pt-2 flex justify-end">
                <Button type="button" variant="outline" size="sm">
                  Log out of other devices
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
