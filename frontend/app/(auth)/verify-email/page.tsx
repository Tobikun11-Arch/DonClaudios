'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {resendVerificationCode, verifyCustomerEmail} from '@/lib/api/authApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailFromQuery = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setEmail(emailFromQuery);
  }, [emailFromQuery]);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && code.trim().length === 6;
  }, [email, code]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await verifyCustomerEmail({email: email.trim(), code: code.trim()});
      setSuccessMessage('Your email has been verified. You can now sign in.');
      router.push('/sign-in');
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'Verification failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (isResending) return;

    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await resendVerificationCode({email: email.trim()});
      setSuccessMessage('Verification code resent. Please check your email.');
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'Failed to resend code.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Verify your email
        </h2>
        <p className="text-muted-foreground">
          Enter the 6-digit code we sent to your email address.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isSubmitting || isResending}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={e =>
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            disabled={isSubmitting}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-[#3c5e45]"
          size="lg"
          disabled={isSubmitting || !canSubmit}
        >
          {isSubmitting ? 'Verifying...' : 'Verify Email'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={handleResend}
          disabled={isResending || email.trim().length === 0}
        >
          {isResending ? 'Resending...' : 'Resend code'}
        </Button>

        {errorMessage && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-md border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already verified?{' '}
        <Link
          href="/sign-in"
          className="text-[#3c5e45] font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
