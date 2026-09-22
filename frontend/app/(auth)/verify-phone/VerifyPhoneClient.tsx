'use client';

import {useEffect, useMemo, useState, type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {Check} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator
} from '@/components/ui/input-otp';
import {resendVerificationCode, verifyCustomerPhone} from '@/lib/api/authApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';

export default function VerifyPhoneClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const phoneFromQuery = searchParams.get('phone') ?? '';

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!isVerified) return;

    const timer = setTimeout(() => {
      router.push('/sign-in');
    }, 2200);

    return () => clearTimeout(timer);
  }, [isVerified, router]);

  const canSubmit = useMemo(() => {
    return phoneFromQuery.trim().length > 0 && code.trim().length === 6;
  }, [phoneFromQuery, code]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await verifyCustomerPhone({
        phoneNumber: phoneFromQuery.trim(),
        code: code.trim()
      });
      setIsVerified(true);
      setSuccessMessage(
        'Your phone number has been verified. You can now sign in.'
      );
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
      await resendVerificationCode({phoneNumber: phoneFromQuery.trim()});
      setSuccessMessage('Verification code resent. Please check your phone.');
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'Failed to resend code.'));
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/40" />
          <div className="relative flex h-24 w-24 animate-in zoom-in items-center justify-center rounded-full bg-[#3c5e45] shadow-lg duration-500">
            <Check className="h-12 w-12 text-white" strokeWidth={3} />
          </div>
        </div>
        <p className="text-xl font-bold text-foreground">Phone verified!</p>
        <p className="text-sm text-muted-foreground">
          Your phone number has been verified successfully. Redirecting you to
          sign in…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Verify your phone number
        </h2>
        <p className="text-muted-foreground">
          Enter the 6-digit code we texted to {phoneFromQuery.trim()}.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">Verification Code</Label>
          <div className="flex justify-center">
            <InputOTP
              id="otp"
              maxLength={6}
              value={code}
              onChange={(value: string) =>
                setCode(value.replace(/\D/g, '').slice(0, 6))
              }
              disabled={isSubmitting}
              autoComplete="one-time-code"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#3c5e45]"
          size="lg"
          disabled={isSubmitting || !canSubmit}
        >
          {isSubmitting ? 'Verifying...' : 'Verify Phone'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={handleResend}
          disabled={isResending || phoneFromQuery.trim().length === 0}
        >
          {isResending ? 'Resending...' : 'Resend code'}
        </Button>

        {errorMessage && (
          <div className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">
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