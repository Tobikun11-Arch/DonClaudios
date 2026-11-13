'use client';

import {useRef, useState, type FormEvent, type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {
  useChangePasswordMutation,
  useUpdateProfileMutation
} from '@/lib/hooks/auth/useProfile';
import {useLogout} from '@/lib/hooks/auth/useLogout';
import {useSettingsQuery} from '@/lib/hooks/useSettings';
import {usePublicBrand} from '@/lib/hooks/useBrand';
import {storeStatusQueryKey} from '@/lib/hooks/useStoreStatus';
import {getStoreStatus} from '@/lib/api/storeStatusApi';
import {uploadProfileImage} from '@/lib/api/uploadApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {validatePassword} from '@/lib/utils/passwordRules';
import {playNotificationSound} from '@/lib/hooks/notifications/useNotificationSound';
import {playChatMessageSound} from '@/lib/hooks/support/useChatSound';
import {setCashierPrefs, useCashierPrefs} from '@/lib/cashier/cashierPrefs';
import {PAYMENT_METHODS} from '@/features/cashier/counter/counterShared';
import {
  AtSign,
  BadgeCheck,
  BellRing,
  CalendarDays,
  Camera,
  Check,
  Info,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
  Volume2
} from 'lucide-react';
import {cn} from '@/lib/utils';
import CashierNotificationBell from '@/features/cashier/notifications/components/CashierNotificationBell';

const SECTIONS = [
  {id: 'profile', label: 'Profile', icon: UserRound, hint: 'Your photo, name and contact details.'},
  {id: 'counter', label: 'Counter', icon: Store, hint: 'How the counter works on this device.'},
  {id: 'alerts', label: 'Alerts', icon: BellRing, hint: 'Sounds for new orders and customers waiting.'},
  {id: 'store', label: 'Store info', icon: Info, hint: 'Hours and contact details to tell customers.'},
  {id: 'security', label: 'Security', icon: ShieldCheck, hint: 'Your password and signing out.'}
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export function CashierSettings() {
  const [section, setSection] = useState<SectionId>('profile');
  const current = SECTIONS.find(s => s.id === section)!;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-[#2d4a35]">Settings</h1>
          <p className="text-sm text-gray-500">
            Your account, this counter, alerts and store info.
          </p>
        </div>
        <CashierNotificationBell />
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Section nav: a list on desktop, scrollable pills on phones */}
        <nav
          aria-label="Settings sections"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide md:mx-0 md:w-56 md:shrink-0 md:flex-col md:gap-1 md:overflow-visible md:px-0"
        >
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = s.id === section;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#e9f5ee] text-[#2d4a35] font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 border border-gray-200 md:border-0'
                )}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{current.label}</h2>
            <p className="text-sm text-gray-500">{current.hint}</p>
          </div>
          {section === 'profile' && <ProfileSection />}
          {section === 'counter' && <CounterSection />}
          {section === 'alerts' && <AlertsSection />}
          {section === 'store' && <StoreInfoSection />}
          {section === 'security' && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}

function Card({title, children, note}: {title?: string; children: ReactNode; note?: ReactNode}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      {title && <h3 className="mb-4 text-base font-bold text-[#2d4a35]">{title}</h3>}
      {children}
      {note && <p className="mt-4 text-xs text-gray-500">{note}</p>}
    </div>
  );
}

function SettingLine({
  label,
  description,
  children
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="mt-0.5 text-xs text-gray-500">{description}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d4a35]/40',
        checked ? 'bg-[#2d4a35]' : 'bg-gray-300'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

/* ── Profile ─────────────────────────────────────────────── */

function ProfileSection() {
  const meQuery = useMeQuery();
  const user = meQuery.data?.user;
  const updateProfileMutation = useUpdateProfileMutation();
  const [editing, setEditing] = useState(false);

  if (!user) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  const displayFullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-PH', {month: 'long', year: 'numeric'})
    : null;
  const fields = [user.firstName, user.lastName, user.username, user.email, user.phoneNumber, user.address];
  const filled = fields.filter(v => typeof v === 'string' && v.trim()).length;
  const complete = Math.round((filled / fields.length) * 100);

  const persist = (body: Record<string, string>, opts?: {successMessage?: string}) => {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' && value.trim().length === 0) continue;
      cleaned[key] = value;
    }
    updateProfileMutation.mutate(cleaned, {
      onError: err => toast.error(getFriendlyErrorMessage(err, 'Failed to save')),
      onSuccess: () => toast.success(opts?.successMessage ?? 'Saved.')
    });
  };

  return (
    <div className="space-y-4">
      {/* Identity card: banner in this dashboard's colors (owner's Customize) */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div
          className="relative h-24 sm:h-28"
          style={{
            background:
              'linear-gradient(120deg, var(--dash-sidebar, #2d4a35) 0%, var(--dash-accent, #4a7c59) 100%)'
          }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, white 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, white 0 1.5px, transparent 2.5px)',
              backgroundSize: '48px 48px, 64px 64px'
            }}
          />
        </div>
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {/* `flex`: the photo is an inline <button>; as a block child it left a
                  text-baseline gap below it, pushing the photo off-center in the ring. */}
              <div className="flex shrink-0 rounded-full bg-white p-1 shadow-md">
                <AvatarUpload
                  imageUrl={user.profilePhoto}
                  fallback={displayFullName || 'D'}
                  onSave={url => persist({profilePhoto: url}, {successMessage: 'Profile photo updated.'})}
                />
              </div>
              <div className="min-w-0 pb-1">
                <div className="truncate text-xl font-bold text-gray-900">
                  {displayFullName || user.username || 'Cashier'}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  {user.username && <span>@{user.username}</span>}
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e9f5ee] px-2.5 py-0.5 text-xs font-semibold text-[#2d4a35]">
                    <BadgeCheck className="h-3.5 w-3.5" /> Cashier
                  </span>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant={editing ? 'default' : 'outline'}
              onClick={() => setEditing(e => !e)}
              className={cn('self-start sm:self-end', editing && 'bg-[#2d4a35] text-white hover:bg-[#24402c]')}
            >
              {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {editing ? 'Done' : 'Edit profile'}
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat icon={CalendarDays} label="Member since" value={memberSince ?? '—'} />
            <Stat icon={Mail} label="Sign-in email" value={user.email || 'Not set'} />
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Profile complete</span>
                <span className="font-semibold text-gray-900">{complete}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{width: `${complete}%`, background: 'var(--dash-accent, #4a7c59)'}}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {complete < 100 && !editing && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Add your missing details so the owner can reach you about shifts and orders.{' '}
            <button type="button" className="font-semibold underline" onClick={() => setEditing(true)}>
              Complete profile
            </button>
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Personal details" icon={UserRound}>
          <ProfileRow icon={UserRound} label="First name" value={user.firstName ?? ''} editing={editing} onSave={v => persist({firstName: v})} />
          <ProfileRow icon={UserRound} label="Last name" value={user.lastName ?? ''} editing={editing} onSave={v => persist({lastName: v})} />
          <ProfileRow icon={AtSign} label="Username" value={user.username ?? ''} editing={editing} onSave={v => persist({username: v})} />
        </DetailCard>
        <DetailCard title="Contact" icon={Phone}>
          <ProfileRow icon={Mail} label="Email" value={user.email ?? ''} editing={editing} onSave={v => persist({email: v})} type="email" />
          <ProfileRow icon={Phone} label="Phone number" value={user.phoneNumber ?? ''} editing={editing} onSave={v => persist({phoneNumber: v})} type="tel" />
          <ProfileRow icon={MapPin} label="Address" value={user.address ?? ''} editing={editing} onSave={v => persist({address: v})} />
        </DetailCard>
      </div>
    </div>
  );
}

function Stat({icon: Icon, label, value}: {icon: typeof Store; label: string; value: string}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="truncate text-sm font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function DetailCard({title, icon: Icon, children}: {title: string; icon: typeof Store; children: ReactNode}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e9f5ee] text-[#2d4a35]">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
  editing,
  onSave,
  type = 'text'
}: {
  icon: typeof Store;
  label: string;
  value: string;
  editing: boolean;
  onSave: (v: string) => void;
  type?: string;
}) {
  const [val, setVal] = useState(value);
  const [saved, setSaved] = useState(false);
  // Pick up the saved value when it changes (and drop stale typing on Done).
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setVal(value);
  }

  const commit = () => {
    const trimmed = val.trim();
    if (trimmed && trimmed !== value.trim()) {
      onSave(trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  return (
    <div className="flex items-center gap-3 py-3">
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-500">{label}</div>
        {editing ? (
          <Input
            type={type}
            value={val}
            aria-label={label}
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="mt-1 min-h-[40px]"
          />
        ) : (
          <div className="flex items-center gap-2 truncate text-[15px] font-medium text-gray-900">
            {value || <span className="font-normal text-gray-400">Not set</span>}
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Counter ─────────────────────────────────────────────── */

function CounterSection() {
  const prefs = useCashierPrefs();
  return (
    <Card note="Saved on this device only, so each counter tablet or PC can have its own setup.">
      <SettingLine
        label="Default payment method"
        description="Pre-selected on every new walk-in ticket. You can still change it per order."
      >
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map(m => {
            const active = prefs.defaultPayment === m.value;
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setCashierPrefs({defaultPayment: m.value});
                  toast.success(`New tickets start with ${m.label}.`);
                }}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </SettingLine>
    </Card>
  );
}

/* ── Alerts ──────────────────────────────────────────────── */

function AlertsSection() {
  const prefs = useCashierPrefs();
  return (
    <Card note="Saved on this device only. Browsers play sounds only after you've clicked somewhere on the page once.">
      <div className="divide-y divide-gray-100">
        <SettingLine
          label="New order & notification sound"
          description="A chime when an online order or other notification arrives."
        >
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => playNotificationSound()}>
              <Volume2 className="h-4 w-4" /> Test
            </Button>
            <Toggle
              label="New order sound"
              checked={prefs.orderSound}
              onChange={v => setCashierPrefs({orderSound: v})}
            />
          </div>
        </SettingLine>
        <SettingLine
          label="Customer waiting sound"
          description="A double pop when a customer starts waiting in support chat."
        >
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => playChatMessageSound(true)}>
              <Volume2 className="h-4 w-4" /> Test
            </Button>
            <Toggle
              label="Customer waiting sound"
              checked={prefs.chatSound}
              onChange={v => setCashierPrefs({chatSound: v})}
            />
          </div>
        </SettingLine>
      </div>
    </Card>
  );
}

/* ── Store info (read-only) ──────────────────────────────── */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(hhmm?: string) {
  if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return hhmm || '—';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

function StoreInfoSection() {
  // One read when this section opens (no polling): cashiers only need it to
  // answer customers, and the owner's Store Status page is the source of truth.
  const statusQuery = useQuery({
    queryKey: storeStatusQueryKey,
    queryFn: getStoreStatus,
    staleTime: 5 * 60_000
  });
  const settingsQuery = useSettingsQuery();
  const brand = usePublicBrand();
  const status = statusQuery.data?.status;
  const contact = settingsQuery.data?.contact;

  return (
    <div className="space-y-4">
      <Card title="Today">
        {statusQuery.isLoading ? (
          <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ) : !status ? (
          <p className="text-sm text-gray-500">Couldn&apos;t load the store status right now.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            <SettingLine label="Status" description={status.reason || (status.isOpen ? 'Taking orders.' : status.reopenMessage || 'Not taking orders.')}>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
                  status.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', status.isOpen ? 'bg-green-600' : 'bg-red-600')} />
                {status.isOpen ? 'Open' : 'Closed'}
              </span>
            </SettingLine>
            <SettingLine label="Opening hours" description="Regular daily hours.">
              <span className="text-sm font-medium text-gray-900">
                {formatTime(status.openingTime)} – {formatTime(status.closingTime)}
              </span>
            </SettingLine>
            <SettingLine label="Closed days" description="Days the store doesn't open.">
              <span className="text-sm font-medium text-gray-900">
                {status.closedDays?.length
                  ? status.closedDays.map(d => DAY_NAMES[d] ?? d).join(', ')
                  : 'Open every day'}
              </span>
            </SettingLine>
            {status.advanceCloseMinutes > 0 && (
              <SettingLine label="Last orders" description="Online ordering stops before closing time.">
                <span className="text-sm font-medium text-gray-900">
                  {status.advanceCloseMinutes} min before closing
                </span>
              </SettingLine>
            )}
          </div>
        )}
      </Card>

      <Card title="Contact details" note="Only the owner can change store hours and contact details.">
        <div className="space-y-3 text-sm">
          <InfoRow icon={Store} label="Business" value={brand.name} />
          <InfoRow icon={MapPin} label="Address" value={contact?.address} />
          <InfoRow icon={Phone} label="Phone" value={contact?.phones?.filter(Boolean).join(' · ')} />
          <InfoRow icon={Mail} label="Email" value={contact?.email} />
        </div>
      </Card>
    </div>
  );
}

function InfoRow({icon: Icon, label, value}: {icon: typeof Store; label: string; value?: string}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e9f5ee] text-[#2d4a35]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="break-words font-medium text-gray-900">{value || <span className="text-gray-400">Not set</span>}</div>
      </div>
    </div>
  );
}

/* ── Security ────────────────────────────────────────────── */

function SecuritySection() {
  const changePasswordMutation = useChangePasswordMutation();
  const logoutMutation = useLogout();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pw, setPw] = useState({currentPassword: '', newPassword: '', confirmPassword: ''});

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!pw.currentPassword) {
      setFormError('Please enter your current password.');
      return;
    }
    const newPasswordCheck = validatePassword(pw.newPassword);
    if (!newPasswordCheck.valid) {
      setFormError(`New password must include: ${newPasswordCheck.unmet[0]}.`);
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
    <div className="space-y-4">
      <Card title="Change password">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cashier-currentPassword">Current password</Label>
            <Input
              id="cashier-currentPassword"
              type="password"
              autoComplete="current-password"
              value={pw.currentPassword}
              onChange={e => setPw(p => ({...p, currentPassword: e.target.value}))}
              className="min-h-[44px]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cashier-newPassword">New password</Label>
              <Input
                id="cashier-newPassword"
                type="password"
                autoComplete="new-password"
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
                autoComplete="new-password"
                value={pw.confirmPassword}
                onChange={e => setPw(p => ({...p, confirmPassword: e.target.value}))}
                className="min-h-[44px]"
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
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
      </Card>

      <Card title="Shared counter device">
        <SettingLine
          label="Sign out at the end of your shift"
          description="On a shared tablet or PC, sign out so the next cashier's sales aren't recorded under your name."
        >
          <Button
            type="button"
            variant="outline"
            disabled={logoutMutation.isPending}
            onClick={async () => {
              await logoutMutation.mutateAsync();
              router.replace('/sign-in');
            }}
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </SettingLine>
      </Card>
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
      // The success toast comes from the save itself (only once it is saved).
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
