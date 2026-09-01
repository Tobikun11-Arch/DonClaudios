'use client';

import {useRef, useState, type ReactNode} from 'react';
import {toast} from 'sonner';
import {Input} from '@/components/ui/input';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {useUpdateProfileMutation} from '@/lib/hooks/auth/useProfile';
import {uploadProfileImage} from '@/lib/api/uploadApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {Camera, Check, Pencil} from 'lucide-react';
import type {MeUser} from '@/lib/api/authApi';

type FieldDef = {
  label: string;
  value: string;
  save: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
};

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
  const [optimisticUrl, setOptimisticUrl] = useState<string | undefined>(
    imageUrl
  );
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
      className={`group relative shrink-0 overflow-hidden rounded-full focus:outline-none focus-visible:ring-3 focus-visible:ring-[#2d4a35]/40 w-24 h-24 sm:w-28 sm:h-28`}
    >
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentUrl}
          alt="Profile photo"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#e9f5ee] text-[#2d4a35] text-4xl font-bold">
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

function InlineField({field, editing}: {field: FieldDef; editing: boolean}) {
  const [value, setValue] = useState(field.value);
  const [showSaved, setShowSaved] = useState(false);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== field.value.trim()) {
      field.save(trimmed);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    }
  };

  if (editing && !field.readOnly) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">
          {field.label}
        </label>
        <Input
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={field.placeholder}
          className="min-h-[44px]"
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-gray-500">{field.label}</div>
      <div className="flex items-center gap-2 text-[15px] text-gray-800">
        {field.value || (
          <span className="text-gray-400">Not set</span>
        )}
        {showSaved && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  editing,
  onToggleEdit,
  children
}: {
  title: string;
  editing: boolean;
  onToggleEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-[#2d4a35]">{title}</h2>
        <button
          type="button"
          onClick={onToggleEdit}
          aria-label={editing ? 'Finish editing' : 'Edit ' + title}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#2d4a35]"
        >
          {editing ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <Pencil className="h-5 w-5" />
          )}
        </button>
      </div>
      {children}
    </div>
  );
}

export function ProfileTab() {
  const meQuery = useMeQuery();
  const user = meQuery.data?.user;

  const [profileEditing, setProfileEditing] = useState(false);

  const updateProfileMutation = useUpdateProfileMutation();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  const persist = (body: Partial<MeUser>) => {
    const cleaned: Partial<MeUser> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' && value.trim().length === 0) continue;
      cleaned[key as keyof MeUser] = value as never;
    }

    updateProfileMutation.mutate(cleaned, {
      onError: err =>
        toast.error(getFriendlyErrorMessage(err, 'Failed to save')),
      onSuccess: () => toast.success('Saved.')
    });
  };

  const displayFullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ');

  const profileFields: FieldDef[] = [
    {
      label: 'First Name',
      value: user.firstName ?? '',
      save: v => persist({firstName: v})
    },
    {
      label: 'Last Name',
      value: user.lastName ?? '',
      save: v => persist({lastName: v})
    },
    {
      label: 'Phone number',
      value: user.phoneNumber ?? '',
      save: v => persist({phoneNumber: v})
    },
    {
      label: 'Address',
      value: user.address ?? '',
      save: v => persist({address: v})
    },
    {
      label: 'Email',
      value: user.email ?? '',
      save: () => {},
      readOnly: true
    }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Section
        title="Your Profile"
        editing={profileEditing}
        onToggleEdit={() => setProfileEditing(e => !e)}
      >
        <div className="mb-6 flex items-center gap-5">
          <AvatarUpload
            imageUrl={user.profilePhoto}
            fallback={displayFullName || 'D'}
            onSave={url => persist({profilePhoto: url})}
          />
          <div>
            <p className="text-base font-semibold text-gray-900">
              {displayFullName || '—'}
            </p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {profileFields.map(f => (
            <InlineField
              key={`${f.label}-${profileEditing}`}
              field={f}
              editing={profileEditing}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
