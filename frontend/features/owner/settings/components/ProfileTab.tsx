'use client';

import {useRef, useState, type ReactNode} from 'react';
import {toast} from 'sonner';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {useQueryClient} from '@tanstack/react-query';
import {meQueryKey, useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {FALLBACK_PREP_MINUTES} from '@/lib/hooks/useDefaultPrepMinutes';
import {useUpdateProfileMutation} from '@/lib/hooks/auth/useProfile';
import {uploadProfileImage} from '@/lib/api/uploadApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {Camera, Check, Pencil} from 'lucide-react';
import type {MeUser, UpdateProfileBody} from '@/lib/api/authApi';
import {DEFAULT_LOGO} from '@/lib/hooks/useBrand';
import {enterNavigation} from '@/shared/utils/enterNavigation';

function AvatarUpload({
  shape,
  label,
  imageUrl,
  fallback,
  defaultImageUrl,
  onSave
}: {
  shape: 'circle' | 'square';
  label: string;
  imageUrl?: string;
  fallback: string;
  /** Shown when no image is set (or it fails to load), instead of the letter. */
  defaultImageUrl?: string;
  onSave: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [optimisticUrl, setOptimisticUrl] = useState<string | undefined>(
    imageUrl
  );
  const [isUploading, setIsUploading] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | undefined>();

  // Drop the optimistic preview once the saved value changes (e.g. "Reset to
  // defaults" clears it), so a stale upload doesn't linger.
  const [prevImageUrl, setPrevImageUrl] = useState(imageUrl);
  if (prevImageUrl !== imageUrl) {
    setPrevImageUrl(imageUrl);
    setOptimisticUrl(imageUrl);
  }

  const savedUrl = optimisticUrl || imageUrl;
  const usingDefault = !savedUrl || savedUrl === failedUrl;
  const currentUrl = usingDefault ? defaultImageUrl : savedUrl;

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
      // The success toast comes from the save itself (one toast, and only
      // once the change is really saved).
      onSave(uploaded.imageUrl);
      setOptimisticUrl(uploaded.imageUrl);
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
      aria-label={`Upload ${label}`}
      onClick={() => inputRef.current?.click()}
      className={`group relative shrink-0 overflow-hidden focus:outline-none focus-visible:ring-3 focus-visible:ring-[#2d4a35]/40 ${
        shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
      } w-20 h-20 sm:w-24 sm:h-24`}
    >
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentUrl}
          alt={label}
          className={`h-full w-full ${
            usingDefault
              ? 'object-contain p-2 bg-[#e9f5ee] dark:bg-[#1f3a2a]'
              : 'object-cover'
          }`}
          onError={() => {
            if (!usingDefault) setFailedUrl(savedUrl);
          }}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#e9f5ee] dark:bg-[#1f3a2a] text-[#2d4a35] dark:text-[#7ed4a0] text-3xl font-bold">
          {fallback.charAt(0).toUpperCase()}
        </span>
      )}

      {isUploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        </span>
      )}

      {/* Hover overlay (desktop) + persistent overlay (touch) */}
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

type FieldDef = {
  /** Key sent to the save handler. */
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'text' | 'tel' | 'email';
};

/**
 * A settings card with its own edit mode. The pencil opens it; the check icon
 * or Enter in any field saves every changed field in one request and closes
 * it. A failed save keeps the card open with the typed values.
 */
function EditableSection({
  title,
  fields,
  onSave,
  description,
  header,
  footer
}: {
  title: string;
  fields: FieldDef[];
  /** Resolve true when saved, false to stay in edit mode. */
  onSave: (changes: Record<string, string>) => Promise<boolean>;
  description?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const startEditing = () => {
    setDrafts(Object.fromEntries(fields.map(f => [f.name, f.value])));
    setEditing(true);
  };

  const save = async () => {
    if (saving) return;
    const changes: Record<string, string> = {};
    for (const f of fields) {
      const next = (drafts[f.name] ?? f.value).trim();
      if (next !== f.value.trim()) changes[f.name] = next;
    }
    // Nothing changed: just close.
    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onSave(changes);
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <div
      className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6"
      onKeyDown={enterNavigation}
      data-enter-mode="submit"
    >
      <div className="mb-5 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-[#2d4a35] dark:text-[#7ed4a0]">{title}</h2>
        <button
          type="button"
          onClick={editing ? save : startEditing}
          disabled={saving}
          data-enter-submit={editing ? '' : undefined}
          aria-label={editing ? 'Save ' + title : 'Edit ' + title}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#2d4a35] dark:hover:text-[#7ed4a0] disabled:opacity-60"
        >
          {saving ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-green-600/30 border-t-green-600" />
          ) : editing ? (
            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <Pencil className="h-5 w-5" />
          )}
        </button>
      </div>
      {description}
      {header}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {fields.map((f, i) => (
          <div
            key={f.name}
            className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {f.label}
              </div>
            </div>
            {editing ? (
              <div className="shrink-0 sm:w-[240px]">
                <Input
                  value={drafts[f.name] ?? f.value}
                  onChange={e => {
                    const v = e.target.value;
                    setDrafts(d => ({...d, [f.name]: v}));
                  }}
                  placeholder={f.placeholder}
                  inputMode={f.inputMode}
                  aria-label={f.label}
                  autoFocus={i === 0}
                  readOnly={saving}
                  className="min-h-[44px]"
                />
              </div>
            ) : (
              <div className="text-[15px] text-gray-800 dark:text-gray-200 break-words sm:w-[240px] sm:text-right">
                {f.value || (
                  <span className="text-gray-400 dark:text-gray-500">Not set</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {footer}
    </div>
  );
}

const DEFAULT_BUSINESS_NAME = "DonClaudio's Lechon House";

/** Fields that may be cleared (they fall back to the defaults). */
const CLEARABLE = new Set(['businessName', 'businessLogo']);

export function ProfileTab() {
  const meQuery = useMeQuery();
  const user = meQuery.data?.user;
  const queryClient = useQueryClient();
  const updateProfileMutation = useUpdateProfileMutation();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  /** Saves the body and shows the toast; resolves true on success. */
  const persist = async (
    body: UpdateProfileBody,
    successMessage = 'Saved.'
  ): Promise<boolean> => {
    const cleared = Object.entries(body).some(
      ([key, value]) =>
        !CLEARABLE.has(key) && typeof value === 'string' && value.trim() === ''
    );
    if (cleared) {
      toast.error('This field cannot be empty.');
      return false;
    }

    try {
      const res = await updateProfileMutation.mutateAsync(body);
      // Show the saved values right away instead of waiting for the refetch.
      if (res?.user) {
        queryClient.setQueryData<{user: MeUser}>(meQueryKey, old =>
          old ? {...old, user: {...old.user, ...res.user}} : old
        );
      }
      toast.success(successMessage);
      return true;
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to save'));
      return false;
    }
  };

  const displayFullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ');

  const profileFields: FieldDef[] = [
    {name: 'firstName', label: 'First Name', value: user.firstName ?? ''},
    {name: 'lastName', label: 'Last Name', value: user.lastName ?? ''},
    {name: 'email', label: 'Email', value: user.email ?? '', inputMode: 'email'},
    {
      name: 'phoneNumber',
      label: 'Phone number',
      value: user.phoneNumber ?? '',
      inputMode: 'tel'
    },
    {name: 'username', label: 'Username', value: user.username ?? ''}
  ];

  const businessFields: FieldDef[] = [
    {
      name: 'businessName',
      label: 'Business/store name',
      value: user.businessName || DEFAULT_BUSINESS_NAME
    },
    {name: 'storeAddress', label: 'Store address', value: user.storeAddress ?? ''},
    {
      name: 'businessContactNumber',
      label: 'Business contact number',
      value: user.businessContactNumber ?? '',
      inputMode: 'tel'
    },
    {
      name: 'operatingHours',
      label: 'Operating hours',
      value: user.operatingHours ?? ''
    },
    {name: 'businessType', label: 'Business type', value: user.businessType ?? ''}
  ];

  const prepFields: FieldDef[] = [
    {
      name: 'defaultPrepMinutes',
      label: 'Default prep time (minutes)',
      value: String(user.defaultPrepMinutes ?? FALLBACK_PREP_MINUTES),
      placeholder: String(FALLBACK_PREP_MINUTES),
      inputMode: 'numeric'
    }
  ];

  return (
    <div className="space-y-6">
      <EditableSection
        title="Your Profile"
        fields={profileFields}
        onSave={changes => persist(changes)}
        header={
          <div className="mb-6">
            <AvatarUpload
              shape="circle"
              label="Profile photo"
              imageUrl={user.profilePhoto}
              fallback={displayFullName || 'D'}
              onSave={url =>
                void persist({profilePhoto: url}, 'Profile photo updated.')
              }
            />
          </div>
        }
      />

      <EditableSection
        title="Business Details"
        fields={businessFields}
        onSave={changes => persist(changes)}
        header={
          <div className="mb-6">
            <AvatarUpload
              shape="square"
              label="Business logo"
              imageUrl={user.businessLogo}
              fallback={(user.businessName || 'D').charAt(0)}
              defaultImageUrl={DEFAULT_LOGO}
              onSave={url =>
                void persist({businessLogo: url}, 'Business logo updated.')
              }
            />
          </div>
        }
        footer={
          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void persist(
                  {businessName: '', businessLogo: ''},
                  'Business details reset to defaults.'
                );
              }}
              disabled={updateProfileMutation.isPending}
            >
              Reset to defaults
            </Button>
          </div>
        }
      />

      <EditableSection
        title="Kitchen Prep Times"
        fields={prepFields}
        description={
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
            Used when a product has no prep time of its own. Each order is
            estimated by its slowest item, and cashiers are alerted if an order
            stays in Preparing longer than that.
          </p>
        }
        onSave={async changes => {
          const parsed = Number(changes.defaultPrepMinutes);
          if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1440) {
            toast.error('Enter a whole number of minutes between 1 and 1440.');
            return false;
          }
          return persist({defaultPrepMinutes: parsed});
        }}
      />
    </div>
  );
}
