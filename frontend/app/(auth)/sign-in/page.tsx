'use client';

import {useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {Eye, EyeOff, LogIn} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useRouter} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {login} from '@/lib/api/authApi';
import {meQueryKey} from '@/lib/hooks/auth/useMeQuery';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const user = await login({email, password});
      // Clear any stale cached /auth/me (e.g. a previous 401) so the dashboard
      // guard re-fetches and sees the new session instead of redirecting back.
      queryClient.removeQueries({queryKey: meQueryKey});
      if (user.user.type === 'admin') {
        router.push('/owner/dashboard');
      } else if (user.user.type === 'cashier') {
        router.push('/cashier/dashboard');
      } else {
        router.push('/customer/dashboard');
      }
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'Failed to sign in'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image
          src="/assets/logo.png"
          alt="DonClaudio's logo"
          width={128}
          height={128}
          className="h-auto w-[128px] max-[819px]:w-[104px]"
          style={{filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.18))'}}
        />
        <h2
          className="mt-5 text-[32px] font-bold leading-[1.15] text-[#1D211E] max-[819px]:text-[28px]"
        >
          Welcome back
        </h2>
        <p
          className="mt-2 text-[16px] font-normal leading-[1.4] text-[#6B736D]"
        >
          Sign in to your account to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-0">
        <div className="space-y-2">
          <Label htmlFor="email">Email or Phone Number</Label>
          <Input
            id="email"
            type="text"
            placeholder="you@example.com or 09xxxxxxxxx"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="mt-6 h-[48px] w-full rounded-[10px] bg-[#3c5e45]"
          disabled={isSubmitting}
        >
          <LogIn size={18} />
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>

        {errorMessage && (
          <div className="mt-2 rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
      </form>

      <p className="mt-6 text-center text-[15px] text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/sign-up"
          className="text-[#3c5e45] font-semibold hover:underline"
        >
          Sign up
        </Link>
      </p>

      <div className="mt-5 mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#D9DCD5]" />
        <span className="text-[13px] text-[#6B736D]">or</span>
        <div className="h-px flex-1 bg-[#D9DCD5]" />
      </div>

      <Link
        href="/order"
        className="mb-6 flex h-[46px] w-full items-center justify-center rounded-[10px] border-[1.5px] border-[#D9DCD5] bg-transparent font-semibold text-[#2C4A3A] transition-colors hover:border-[#2C4A3A]"
      >
        Continue as guest
      </Link>
    </div>
  );
}
