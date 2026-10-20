'use client';
import {useState, useEffect} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft, Send, Lock} from 'lucide-react';
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
import {forgotPassword, verifyResetCode, resetPassword} from '@/lib/api/authApi';

type Step = 'email' | 'code' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (step === 'done') {
      const t = setTimeout(() => router.push('/sign-in'), 2000);
      return () => clearTimeout(t);
    }
  }, [step, router]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await forgotPassword(email.trim());
      setStep('code');
    } catch (error) {
      setErrorMessage(
        getFriendlyErrorMessage(error, 'Unable to send reset code. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await verifyResetCode({email: email.trim(), code: code.trim()});
      setStep('password');
    } catch (error) {
      setErrorMessage(
        getFriendlyErrorMessage(error, 'Invalid or expired code. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
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
      await resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword
      });
      setStep('done');
    } catch (error) {
      setErrorMessage(
        getFriendlyErrorMessage(error, 'Unable to reset password. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back to sign in
      </Link>

      {step === 'email' && (
        <>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Forgot password?
            </h2>
            <p className="text-muted-foreground">
              Enter your email and we&apos;ll send you a 6-digit reset code.
            </p>
          </div>
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
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
              <Send size={18} />
              {isSubmitting ? 'Sending...' : 'Send Reset Code'}
            </Button>
            {errorMessage && (
              <div className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
          </form>
        </>
      )}

      {step === 'code' && (
        <>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Enter reset code
            </h2>
            <p className="text-muted-foreground">
              We sent a 6-digit code to <span className="font-medium">{email}</span>.
            </p>
          </div>
          <form onSubmit={handleVerifyCode} className="space-y-4">
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
            <Button
              type="submit"
              className="w-full bg-[#3c5e45]"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verifying...' : 'Verify Code'}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setStep('email')}
            >
              Use a different email
            </button>
            {errorMessage && (
              <div className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
          </form>
        </>
      )}

      {step === 'password' && (
        <>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              New password
            </h2>
            <p className="text-muted-foreground">
              Code verified. Choose a new password for your account.
            </p>
          </div>
          <form onSubmit={handleReset} className="space-y-4">
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
        </>
      )}

      {step === 'done' && (
        <div className="space-y-4 text-center">
          <SuccessCheck />
          <h2 className="text-2xl font-bold text-foreground">
            Password reset
          </h2>
          <p className="text-muted-foreground">
            Your password has been updated successfully. Redirecting to sign in…
          </p>
        </div>
      )}
    </div>
  );
}