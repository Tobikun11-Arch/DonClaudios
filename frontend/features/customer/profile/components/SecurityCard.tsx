'use client';

import {useState, type ReactNode} from 'react';
import {toast} from 'sonner';
import {useQueryClient} from '@tanstack/react-query';
import {CheckCircle2, Copy, Download, Mail, Phone, ShieldCheck, Smartphone} from 'lucide-react';
import type {MeUser} from '@/lib/api/authApi';
import {
  disableMfa,
  enableMfa,
  enableTotp,
  linkGoogle,
  sendMfaCode,
  sendPhoneCode,
  setFirstPassword,
  setNewsletter,
  setOrderEmails,
  startTotpSetup,
  unlinkGoogle,
  verifyPhone
} from '@/lib/api/accountSecurityApi';
import {meQueryKey} from '@/lib/hooks/auth/useMeQuery';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {validatePassword} from '@/lib/utils/passwordRules';
import PasswordStrengthChecklist from '@/components/PasswordStrengthChecklist';
import {detectCarrier, normalizePH, toAppCarrier} from '@/lib/phone';
import {GOOGLE_CLIENT_ID, GoogleSignInButton} from '@/features/account/components/GoogleSignInButton';
import {cn} from '@/lib/utils';

const inputClass =
  'min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3c5e45] focus:outline-none focus:ring-2 focus:ring-[#3c5e45]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500';
const primaryButton =
  'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#3c5e45] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2d4a35] disabled:cursor-not-allowed disabled:opacity-60';
const outlineButton =
  'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-[#3c5e45]/40 px-4 text-sm font-semibold text-[#2d4a35] transition-colors hover:bg-[#e9f5ee] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#7ed4a0]/40 dark:text-[#7ed4a0] dark:hover:bg-[#7ed4a0]/10';

function Row({
  icon,
  title,
  status,
  children,
  id
}: {
  icon: ReactNode;
  title: string;
  status?: ReactNode;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className="scroll-mt-24 border-t border-gray-100 pt-4 first:border-t-0 first:pt-0 dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[#2d4a35] dark:text-[#7ed4a0]">{icon}</span>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
        {status ? <span className="ml-auto text-xs">{status}</span> : null}
      </div>
      {children ? <div className="mt-2 space-y-2">{children}</div> : null}
    </div>
  );
}

function Pill({ok, children}: {ok: boolean; children: ReactNode}) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 font-semibold',
        ok
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------- Phone */

function PhoneVerify({user, onDone}: {user: MeUser; onDone: () => void}) {
  const [phone, setPhone] = useState(user.phoneNumber ?? '');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const local = normalizePH(phone);
  const isSmart = local ? toAppCarrier(detectCarrier(local)) === 'smart_tnt' : false;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      if (!local) throw new Error('Enter a valid PH mobile number (09xxxxxxxxx).');
      if (isSmart) {
        // Smart/TNT get no SMS; the Google-verified email confirms it.
        await verifyPhone(local, undefined, true);
        toast.success('Phone number saved. You can order now.');
        onDone();
        return;
      }
      const res = await sendPhoneCode(local);
      if (res.alreadyVerified) {
        await verifyPhone(local);
        toast.success('Phone verified. You can order now.');
        onDone();
        return;
      }
      setSent(true);
      toast.success('We sent a 6-digit code by SMS.');
    });

  const confirm = () =>
    run(async () => {
      if (!local) return;
      await verifyPhone(local, code);
      toast.success('Phone verified. You can order now.');
      setSent(false);
      setCode('');
      onDone();
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className={inputClass}
          inputMode="tel"
          placeholder="09xxxxxxxxx"
          value={phone}
          onChange={e => {
            setPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 13));
            setSent(false);
          }}
          aria-label="Mobile number"
        />
        <button type="button" className={outlineButton} onClick={send} disabled={busy || !local}>
          {isSmart ? 'Save number' : sent ? 'Resend code' : 'Send code'}
        </button>
      </div>
      {isSmart ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Smart/TNT numbers can&apos;t get our SMS codes, so your verified email confirms this number.
        </p>
      ) : null}
      {sent ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={inputClass}
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-label="SMS code"
          />
          <button type="button" className={primaryButton} onClick={confirm} disabled={busy || code.length !== 6}>
            Verify
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------- Password */

function SetPasswordForm({onDone}: {onDone: () => void}) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {valid, unmet} = validatePassword(pw);
    if (!valid) return toast.error(`Password needs: ${unmet.join(', ').toLowerCase()}.`);
    if (pw !== confirm) return toast.error('The passwords do not match.');
    setBusy(true);
    try {
      await setFirstPassword(pw);
      toast.success('Password set. You can now sign in with email and password too.');
      setPw('');
      setConfirm('');
      onDone();
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Could not set your password.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-2" noValidate>
      <input
        type="password"
        className={inputClass}
        placeholder="New password"
        autoComplete="new-password"
        value={pw}
        onChange={e => setPw(e.target.value)}
        aria-label="New password"
      />
      {pw ? <PasswordStrengthChecklist value={pw} /> : null}
      <input
        type="password"
        className={inputClass}
        placeholder="Confirm password"
        autoComplete="new-password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        aria-label="Confirm password"
      />
      <button type="submit" className={primaryButton} disabled={busy}>
        {busy ? 'Saving…' : 'Set password'}
      </button>
    </form>
  );
}

/* -------------------------------------------------------------- MFA */

type MfaStep = 'idle' | 'email-code' | 'app-setup' | 'off-code' | 'switch-code' | 'codes';

/** Turn two-step sign-in on/off. Also used by the owner's Settings > Security. */
export function MfaControl({user, onDone}: {user: MeUser; onDone: () => void}) {
  const enabled = user.mfaEnabled === true;
  const method = user.mfaMethod ?? 'email';
  const [step, setStep] = useState<MfaStep>('idle');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setup, setSetup] = useState<{qrDataUrl: string; secret: string; otpauthUrl: string} | null>(null);

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep('idle');
    setCode('');
    setSetup(null);
  };

  /** Email codes: send one now; typing it back turns MFA on (or off). */
  const startEmail = (next: MfaStep) =>
    run(async () => {
      const res = await sendMfaCode();
      setSentTo(res.sentTo);
      setCode('');
      setStep(next);
    }, 'Could not send the code.');

  /** Authenticator app: show the QR code; the first app code turns it on. */
  const startApp = (currentCode?: string) =>
    run(async () => {
      setSetup(await startTotpSetup(currentCode));
      setCode('');
      setStep('app-setup');
    }, 'Could not start the authenticator setup.');

  const finishTurnOn = (codes: string[], message: string) => {
    setBackupCodes(codes);
    setStep('codes');
    setCode('');
    setSetup(null);
    toast.success(message);
    onDone();
  };

  const confirmEmail = () =>
    run(async () => {
      const res = await enableMfa(code.trim());
      finishTurnOn(res.backupCodes, 'Two-step verification is on (email codes).');
    }, 'That code did not work.');

  const confirmApp = () =>
    run(async () => {
      const res = await enableTotp(code.trim());
      finishTurnOn(res.backupCodes, 'Two-step verification is on (authenticator app).');
    }, 'That code did not work.');

  const confirmOff = () =>
    run(async () => {
      await disableMfa(code.trim());
      toast.success('Two-step verification is off.');
      reset();
      onDone();
    }, 'That code did not work.');

  const codeInput = (placeholder: string, max = 20) => (
    <input
      className={inputClass}
      placeholder={placeholder}
      value={code}
      onChange={e => setCode(e.target.value.slice(0, max))}
      aria-label="Verification code"
      autoComplete="one-time-code"
      inputMode={max === 6 ? 'numeric' : undefined}
    />
  );

  const codesText = backupCodes.join('\n');

  if (step === 'codes') {
    return (
      <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Save your backup codes</p>
        <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
          Each code works once if you can&apos;t get your sign-in code (lost phone, no email). We won&apos;t show
          them again.
        </p>
        <ul className="grid grid-cols-2 gap-1 font-mono text-sm text-gray-900 dark:text-gray-100">
          {backupCodes.map(c => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={outlineButton}
            onClick={() => navigator.clipboard?.writeText(codesText).then(() => toast.success('Copied.'))}
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
          <button
            type="button"
            className={outlineButton}
            onClick={() => {
              const url = URL.createObjectURL(new Blob([codesText], {type: 'text/plain'}));
              const a = document.createElement('a');
              a.href = url;
              a.download = 'donclaudios-backup-codes.txt';
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            <Download className="h-4 w-4" /> Download
          </button>
          <button type="button" className={primaryButton} onClick={reset}>
            I saved them
          </button>
        </div>
      </div>
    );
  }

  if (step === 'app-setup' && setup) {
    return (
      <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <ol className="list-decimal space-y-1 pl-5 text-xs text-gray-600 dark:text-gray-300">
          <li>Install Google Authenticator, Microsoft Authenticator or Authy on your phone.</li>
          <li>In the app, tap + and scan this QR code.</li>
          <li>Type the 6-digit code the app shows for DonClaudio&apos;s.</li>
        </ol>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL from the API */}
          <img
            src={setup.qrDataUrl}
            alt="QR code for your authenticator app"
            width={176}
            height={176}
            className="rounded-lg border border-gray-200 bg-white p-1"
          />
          <div className="min-w-0 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p>Can&apos;t scan? Enter this key in the app instead:</p>
            <p className="break-all font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{setup.secret}</p>
            <a href={setup.otpauthUrl} className="inline-block font-semibold text-[#2d4a35] underline dark:text-[#7ed4a0]">
              On this phone? Open in authenticator app
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {codeInput('6-digit code from the app', 6)}
          <button type="button" className={primaryButton} onClick={confirmApp} disabled={busy || code.trim().length !== 6}>
            {busy ? 'Checking…' : 'Turn on'}
          </button>
          <button type="button" className={outlineButton} onClick={reset}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === 'email-code') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Enter the 6-digit code we sent to {sentTo ?? 'your email'}.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {codeInput('6-digit code', 6)}
          <button type="button" className={primaryButton} onClick={confirmEmail} disabled={busy || code.trim().length !== 6}>
            Turn on
          </button>
          <button type="button" className={outlineButton} onClick={reset}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === 'switch-code') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          To switch, enter the 6-digit code we sent to {sentTo ?? 'your email'}, or one of your backup codes.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {codeInput('Code or backup code')}
          <button
            type="button"
            className={primaryButton}
            onClick={() => startApp(code.trim())}
            disabled={busy || code.trim().length < 6}
          >
            Continue
          </button>
          <button type="button" className={outlineButton} onClick={reset}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === 'off-code') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {method === 'totp'
            ? 'Enter the code from your authenticator app, or one of your backup codes.'
            : `Enter the 6-digit code we sent to ${sentTo ?? 'your email'}, or one of your backup codes.`}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {codeInput('Code or backup code')}
          <button type="button" className={primaryButton} onClick={confirmOff} disabled={busy || code.trim().length < 6}>
            Turn off
          </button>
          <button type="button" className={outlineButton} onClick={reset}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {method === 'totp'
            ? 'Signing in also needs the code from your authenticator app.'
            : 'Signing in also needs a code we email you.'}{' '}
          {user.backupCodesLeft ?? 0} backup codes left.
        </p>
        <div className="flex flex-wrap gap-2">
          {method === 'email' ? (
            <button type="button" className={outlineButton} onClick={() => startEmail('switch-code')} disabled={busy}>
              <Smartphone className="h-4 w-4" /> Switch to authenticator app
            </button>
          ) : null}
          <button
            type="button"
            className={outlineButton}
            disabled={busy}
            onClick={() => (method === 'totp' ? setStep('off-code') : startEmail('off-code'))}
          >
            {busy ? 'Please wait…' : 'Turn off'}
          </button>
        </div>
        {method === 'totp' ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            To go back to email codes, turn this off and turn it on again with email.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Add a second step to sign-in. Choose how you get the code:
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => startEmail('email-code')}
          disabled={busy}
          className="rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-[#3c5e45] hover:bg-[#e9f5ee] disabled:opacity-60 dark:border-gray-700 dark:hover:bg-[#7ed4a0]/10"
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Mail className="h-4 w-4" /> Email code
          </span>
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
            We email you a code each time. Nothing to install.
          </span>
        </button>
        <button
          type="button"
          onClick={() => startApp()}
          disabled={busy}
          className="rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-[#3c5e45] hover:bg-[#e9f5ee] disabled:opacity-60 dark:border-gray-700 dark:hover:bg-[#7ed4a0]/10"
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Smartphone className="h-4 w-4" /> Authenticator app
            <span className="rounded-full bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              More secure
            </span>
          </span>
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
            Google or Microsoft Authenticator. Works offline.
          </span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Card */

/**
 * Profile > Sign-in & security: phone verification (needed to order with a
 * Google account), the linked Google account, a first password for
 * Google-only accounts, optional two-step sign-in, and order emails.
 */
export function SecurityCard({user}: {user: MeUser | undefined}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const refresh = () => queryClient.invalidateQueries({queryKey: meQueryKey});

  const phoneOk = !user.needsPhoneVerification && !!user.phoneNumber;

  const act = async (fn: () => Promise<unknown>, success: string, fallback: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      await refresh();
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-lg font-bold text-[#2d4a35] dark:text-[#7ed4a0]">Sign-in &amp; security</h2>

      <Row
        id="verify-phone"
        icon={<Phone className="h-4 w-4" />}
        title="Phone number"
        status={
          <Pill ok={phoneOk}>{phoneOk ? 'Verified' : user.needsPhoneVerification ? 'Needed to order' : 'Not verified'}</Pill>
        }
      >
        {phoneOk ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">{user.phoneNumber}</p>
        ) : (
          <PhoneVerify user={user} onDone={refresh} />
        )}
      </Row>

      {GOOGLE_CLIENT_ID || user.googleLinked ? (
        <Row
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Google"
          status={<Pill ok={!!user.googleLinked}>{user.googleLinked ? 'Connected' : 'Not connected'}</Pill>}
        >
          {user.googleLinked ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">{user.googleEmail}</span>
              <button
                type="button"
                className={outlineButton}
                disabled={busy || user.hasPassword === false}
                title={user.hasPassword === false ? 'Set a password first' : undefined}
                onClick={() => act(unlinkGoogle, 'Google was unlinked.', 'Could not unlink Google.')}
              >
                Unlink
              </button>
              {user.hasPassword === false ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">Set a password below before unlinking.</span>
              ) : null}
            </div>
          ) : (
            <div className="max-w-[320px]">
              <GoogleSignInButton
                text="continue_with"
                disabled={busy}
                onCredential={credential =>
                  act(() => linkGoogle(credential), 'Google is connected.', 'Could not connect Google.')
                }
              />
            </div>
          )}
        </Row>
      ) : null}

      {user.hasPassword === false ? (
        <Row icon={<ShieldCheck className="h-4 w-4" />} title="Password" status={<Pill ok={false}>Not set</Pill>}>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You sign in with Google. Add a password to also sign in with your email.
          </p>
          <SetPasswordForm onDone={refresh} />
        </Row>
      ) : null}

      <Row
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Two-step verification"
        status={
          <Pill ok={!!user.mfaEnabled}>
            {user.mfaEnabled ? (user.mfaMethod === 'totp' ? 'On · Authenticator app' : 'On · Email code') : 'Off'}
          </Pill>
        }
      >
        <MfaControl user={user} onDone={refresh} />
      </Row>

      <Row icon={<Mail className="h-4 w-4" />} title="Order update emails">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Email me when my order is ready, on the way, or cancelled.
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#3c5e45]"
            checked={user.orderEmailUpdates !== false}
            disabled={busy}
            onChange={e => {
              const next = e.target.checked;
              act(
                () => setOrderEmails(next),
                next ? 'Order emails are on.' : 'Order emails are off.',
                'Could not save.'
              );
            }}
          />
        </label>
      </Row>

      <Row icon={<Mail className="h-4 w-4" />} title="Newsletter">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Email me about new products, promos and pre-orders.
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#3c5e45]"
            checked={user.newsletterOptIn === true}
            disabled={busy}
            onChange={e => {
              const next = e.target.checked;
              act(
                () => setNewsletter(next),
                next ? 'You are subscribed to the newsletter.' : 'You are unsubscribed from the newsletter.',
                'Could not save.'
              );
            }}
          />
        </label>
      </Row>
    </div>
  );
}
