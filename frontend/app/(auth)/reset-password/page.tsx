'use client';
import {Suspense, useState, useEffect} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {ArrowLeft, Lock} from 'lucide-react';
import SuccessCheck from '@/components/ui/success-check';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/components/ui/input-otp';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {resetPassword} from '@/lib/api/authApi';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const e = searchParams.get('email');
    if (e) setEmail(e);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    if (newPassword !== confirm) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({email: email.trim(), code: code.trim(), newPassword});
      setSuccess(true);
      setTimeout(() => router.push('/sign-in'), 2000);
    } catch (error) {
      setErrorMessage(
        getFriendlyErrorMessage(error, 'Unable to reset password. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <SuccessCheck />
        <h2 className="text-2xl font-bold text-foreground">Password reset</h2>
        <p className="text-muted-foreground">
          Your password has been updated. Redirecting to sign in…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back to sign in
      </Link>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Reset password
        </h2>
        <p className="text-muted-foreground">
          Enter the 6-digit code sent to your email and choose a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Reset code</Label>
          <InputOTP
            id="code"
            maxLength={6}
            value={code}
            onChange={value => setCode(value)}
            disabled={isSubmitting}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({length: 6}).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-[#3c5e45]"
          size="lg"
          disabled={isSubmitting}
        >
          <Lock size={18} />
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </Button>

        {errorMessage && (
          <div className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="space-y-6" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}