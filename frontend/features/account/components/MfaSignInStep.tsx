'use client';

import {useState} from 'react';
import {ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {InputOTP, InputOTPGroup, InputOTPSlot} from '@/components/ui/input-otp';
import {resendMfaSignInCode, verifyMfaSignIn, type SignInResult} from '@/lib/api/accountSecurityApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';

/**
 * Second sign-in step for customers with two-step verification on: the
 * 6-digit code we emailed, or one of their backup codes.
 */
export function MfaSignInStep({
  challengeToken,
  sentTo,
  method = 'email',
  onSignedIn,
  onCancel
}: {
  challengeToken: string;
  sentTo: string | null;
  method?: 'email' | 'totp';
  onSignedIn: (result: SignInResult) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await verifyMfaSignIn(challengeToken, code.trim()));
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'That code did not work.'));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      const res = await resendMfaSignInCode(challengeToken);
      setNotice(`New code sent to ${res.sentTo}.`);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not send a new code.'));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" aria-label="Two-step verification">
      <div className="flex flex-col items-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e9f5ee] text-[#2d4a35]">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h2 className="mt-3 text-2xl font-bold text-[#1D211E]">Enter your code</h2>
        <p className="mt-1 text-sm text-[#6B736D]">
          {useBackup
            ? 'Type one of the backup codes you saved when you turned on two-step verification.'
            : method === 'totp'
              ? 'Open your authenticator app (Google Authenticator, Microsoft Authenticator…) and type the 6-digit code for DonClaudio’s.'
              : `We sent a 6-digit code to ${sentTo ?? 'your email'}. It expires in 5 minutes.`}
        </p>
      </div>

      {useBackup ? (
        <div className="space-y-2">
          <Label htmlFor="backup-code">Backup code</Label>
          <Input
            id="backup-code"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="xxxx-xxxx-xx"
            autoComplete="one-time-code"
            autoFocus
          />
        </div>
      ) : (
        <InputOTP
          maxLength={6}
          value={code}
          onChange={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
          containerClassName="justify-center"
          autoFocus
        >
          <InputOTPGroup>
            {Array.from({length: 6}).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      )}

      <Button
        type="submit"
        className="h-[48px] w-full rounded-[10px] bg-[#3c5e45]"
        disabled={busy || (useBackup ? code.trim().length < 8 : code.length !== 6)}
      >
        {busy ? 'Checking…' : 'Verify and sign in'}
      </Button>

      {error ? (
        <div className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</div>
      ) : notice ? (
        <div className="rounded-md border border-emerald-300 px-3 py-2 text-sm text-emerald-700">{notice}</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        {!useBackup && method === 'email' ? (
          <button type="button" onClick={resend} className="font-medium text-[#3c5e45] hover:underline">
            Resend code
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setUseBackup(v => !v);
            setCode('');
            setError(null);
          }}
          className="font-medium text-[#3c5e45] hover:underline"
        >
          {useBackup ? 'Use the emailed code' : 'Use a backup code'}
        </button>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          Back to sign in
        </button>
      </div>
    </form>
  );
}
