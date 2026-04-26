'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowLeft, Send} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      throw new Error(
        'This feature is not available yet. Please contact support or try again later.'
      );
    } catch (error) {
      setErrorMessage(
        getFriendlyErrorMessage(
          error,
          'Unable to send reset link. Please try again.'
        )
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

      {!submitted ? (
        <>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Forgot password?
            </h2>
            <p className="text-muted-foreground">
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </Button>

            {errorMessage && (
              <div className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
          </form>
        </>
      ) : (
        <div className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Send className="text-primary" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Check your email
          </h2>
          <p className="text-muted-foreground">
            We&apos;ve sent a password reset link to{' '}
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setSubmitted(false)}
          >
            Try another email
          </Button>
        </div>
      )}
    </div>
  );
}
