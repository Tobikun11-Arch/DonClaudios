'use client';

import {useRef, useState, type FormEvent} from 'react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {
  useChangePasswordMutation,
  useUpdateProfileMutation
} from '@/lib/hooks/auth/useProfile';
import {uploadProfileImage} from '@/lib/api/uploadApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {Camera, Check, Pencil} from 'lucide-react';
import {cn} from '@/lib/utils';

export function CashierSettings() {
  const meQuery = useMeQuery();
  const user = meQuery.data?.user;
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();

  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pw, setPw] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  if (!user) {
    return (
      <div className="rounded-2xl bg-white shadow p-10 text-center text-sm text-gray-500">
        Loading profile...
      </div>
    );
  }

  const cashierPhoto = user.profilePhoto;

  const displayFullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ');

  const persist = (body: Record<string, string>, opts?: {silent?: boolean}) => {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' && value.trim().length === 0) continue;
      cleaned[key] = value;
    }
    updateProfileMutation.mutate(cleaned, {
      onError: err =>
        toast.error(getFriendlyErrorMessage(err, 'Failed to save')),
      onSuccess: () => {
        if (!opts?.silent) toast.success('Saved.');
      }
    });
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!pw.currentPassword) {
      setFormError('Please enter your current password.');
      return;
    }
    if (pw.newPassword.length < 8) {
      setFormError('New password must be at least 8 characters.');
      return;
    }
    if (pw.newPassword !== pw.confirmPassword) {
      setFormError('New password and confirmation do not match.');
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword
      });
      toast.success('Password updated.');
      setPw({currentPassword: '', newPassword: '', confirmPassword: ''});
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err, 'Failed to update password'));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#2d4a35]">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your profile photo and account details.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-[#2d4a35]">Your Profile</h3>
          <button
            type="button"
            onClick={() => setEditing(e => !e)}
            aria-label={editing ? 'Finish editing' : 'Edit profile'}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#2d4a35]"
          >
            {editing ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <Pencil className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="mb-6">
          <AvatarUpload
            imageUrl={cashierPhoto}
            fallback={displayFullName || 'D'}
            onSave={url => persist({profilePhoto: url}, {silent: true})}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ProfileField
            label="First Name"
            value={user.firstName ?? ''}
            editing={editing}
            onSave={v => persist({firstName: v})}
          />
          <ProfileField
            label="Last Name"
            value={user.lastName ?? ''}
            editing={editing}
            onSave={v => persist({lastName: v})}
          />
          <ProfileField
            label="Username"
            value={user.username ?? ''}
            editing={editing}
            onSave={v => persist({username: v})}
          />
          <ProfileField
            label="Email"
            value={user.email ?? ''}
            editing={editing}
            onSave={v => persist({email: v})}
          />
          <ProfileField
            label="Phone number"
            value={user.phoneNumber ?? ''}
            editing={editing}
            onSave={v => persist({phoneNumber: v})}
          />
          <ProfileField
            label="Address"
            value={user.address ?? ''}
            editing={editing}
            onSave={v => persist({address: v})}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[#2d4a35]">Change Password</h3>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cashier-currentPassword">Current password</Label>
            <Input
              id="cashier-currentPassword"
              type="password"
              value={pw.currentPassword}
              onChange={e =>
                setPw(p => ({...p, currentPassword: e.target.value}))
              }
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cashier-newPassword">New password</Label>
            <Input
              id="cashier-newPassword"
              type="password"
              value={pw.newPassword}
              onChange={e => setPw(p => ({...p, newPassword: e.target.value}))}
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cashier-confirmPassword">Confirm new password</Label>
            <Input
              id="cashier-confirmPassword"
              type="password"
              value={pw.confirmPassword}
              onChange={e =>
                setPw(p => ({...p, confirmPassword: e.target.value}))
              }
              className="min-h-[44px]"
            />
          </div>

          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {formError}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="bg-[#2d4a35] hover:bg-[#24402c]"
            >
              {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AvatarUpload({
  imageUrl,
  fallback,
  onSave
}: {
  imageUrl?: string;
  fallback: string;
  onSave: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [optimisticUrl, setOptimisticUrl] = useState<string | undefined>(imageUrl);
  const [isUploading, setIsUploading] = useState(false);

  const currentUrl = optimisticUrl || imageUrl;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setOptimisticUrl(objectUrl);
    setIsUploading(true);

    try {
      const uploaded = await uploadProfileImage(file);
      onSave(uploaded.imageUrl);
      setOptimisticUrl(uploaded.imageUrl);
      toast.success('Profile photo updated.');
    } catch (err) {
      setOptimisticUrl(undefined);
      toast.error(getFriendlyErrorMessage(err, 'Failed to upload image'));
    } finally {
      setIsUploading(false);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    }
  };

  return (
    <button
      type="button"
      aria-label="Upload profile photo"
      onClick={() => inputRef.current?.click()}
      className={cn(
        'group relative shrink-0 overflow-hidden rounded-full focus:outline-none',
        'w-20 h-20 sm:w-24 sm:h-24'
      )}
    >
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentUrl}
          alt="Profile"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#e9f5ee] text-[#2d4a35] text-3xl font-bold">
          {fallback.charAt(0).toUpperCase()}
        </span>
      )}

      {isUploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        </span>
      )}

      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white transition-colors duration-200 opacity-0 group-hover:bg-black/40 group-hover:opacity-100 [@media(hover:none)]:bg-black/40 [@media(hover:none)]:opacity-100">
        <Camera className="h-6 w-6" />
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </button>
  );
}

function ProfileField({
  label,
  value,
  editing,
  onSave
}: {
  label: string;
  value: string;
  editing: boolean;
  onSave: (v: string) => void;
}) {
  const [val, setVal] = useState(value);
  const [saved, setSaved] = useState(false);

  const commit = () => {
    const trimmed = val.trim();
    if (trimmed && trimmed !== value.trim()) {
      onSave(trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  if (editing) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <Input
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="min-h-[44px]"
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="flex items-center gap-2 text-[15px] text-gray-800">
        {value || <span className="text-gray-400">Not set</span>}
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}