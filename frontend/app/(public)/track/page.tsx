'use client';

import {Suspense, useEffect, useRef, useState, type FormEvent} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {
  ArrowRight,
  ClipboardPaste,
  Clock,
  Copy,
  Mail,
  ReceiptText,
  RotateCcw,
  Search,
  UserRound,
  X
} from 'lucide-react';
import {toast} from 'sonner';
import OrderTracking from '@/features/order/components/OrderTracking';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';

const RECENT_KEY = 'donclaudios_recent_tracking';
const MAX_RECENT = 5;

/** Tracking numbers are 24-character order ids; accept a pasted link too. */
function extractTrackingNumber(raw: string): string | null {
  const match = raw.trim().match(/[a-f0-9]{24}/i);
  return match ? match[0].toLowerCase() : null;
}

const shortCode = (id: string) => `#${id.slice(-6).toUpperCase()}`;

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    // Private mode / blocked storage: recent lookups are a convenience only.
  }
}

const HELP = [
  {
    icon: Mail,
    title: 'Check your email',
    body: 'The “Your order is in!” email shows your tracking number and a Track button.'
  },
  {
    icon: ReceiptText,
    title: 'Your order page',
    body: 'After placing an order, the tracking number is at the top of the order page. Copy it from there.'
  },
  {
    icon: UserRound,
    title: 'Have an account?',
    body: 'Sign in and open Order history to see every order without a tracking number.'
  }
];

function TrackOrder() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const meQuery = useMeQuery();
  const isCustomer = meQuery.data?.user.type === 'customer';

  const activeId = extractTrackingNumber(searchParams.get('id') ?? '');
  const [input, setInput] = useState(activeId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // localStorage is only readable after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(readRecent());
  }, []);

  // Remember a looked-up order and bring the results into view.
  useEffect(() => {
    if (!activeId) return;
    const next = [activeId, ...readRecent().filter(r => r !== activeId)];
    writeRecent(next);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(next.slice(0, MAX_RECENT));
    resultsRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, [activeId]);

  const track = (raw: string) => {
    const id = extractTrackingNumber(raw);
    if (!raw.trim()) {
      setError('Enter your tracking number first.');
      inputRef.current?.focus();
      return;
    }
    if (!id) {
      setError('That doesn’t look like a tracking number. It has 24 letters and numbers, e.g. 6650f1c2a9b3e4d5f6a7b8c9.');
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setInput(id);
    router.replace(`${pathname}?id=${id}`, {scroll: false});
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    track(input);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text.trim());
      if (extractTrackingNumber(text)) track(text);
      else setError('Your clipboard doesn’t have a tracking number in it.');
    } catch {
      toast.error('Couldn’t read your clipboard. Paste it into the box instead.');
      inputRef.current?.focus();
    }
  };

  const reset = () => {
    setInput('');
    setError(null);
    router.replace(pathname, {scroll: false});
    window.scrollTo({top: 0, behavior: 'smooth'});
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const removeRecent = (id: string) => {
    const next = recent.filter(r => r !== id);
    writeRecent(next);
    setRecent(next);
  };

  const copyLink = () => {
    if (!activeId) return;
    navigator.clipboard
      ?.writeText(`${window.location.origin}/track?id=${activeId}`)
      .then(() => toast.success('Tracking link copied.'))
      .catch(() => toast.error('Couldn’t copy the link.'));
  };

  const looksValid = !!extractTrackingNumber(input);

  return (
    <main className="min-h-screen bg-[#f6f8f5] pb-16">
      {/* Hero: starts under the fixed header (its top padding clears it). */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2d4a35] via-[#3c5e45] to-[#4a7c59] text-white">
        <div className="pointer-events-none absolute -left-20 -top-10 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-28 -right-10 h-72 w-72 rounded-full bg-[#fbd897]/10" />
        <div className="relative mx-auto flex max-w-3xl items-center gap-4 px-4 pb-24 pt-28 sm:gap-8 sm:pb-28 sm:pt-32">
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#fbd897]">
              <Clock className="h-3.5 w-3.5" />
              Live order tracking
            </p>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">
              Where&apos;s my lechon?
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/80 sm:text-base">
              Paste your tracking number (or the whole link from your email) and
              follow your order from the kitchen to you.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center">
            <div className="relative mb-2 hidden rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-[#2d4a35] shadow-lg sm:block">
              {activeId ? `Found it! Order ${shortCode(activeId)} 🐷` : 'On my way to find your order!'}
              <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
            </div>
            <Image
              src="/assets/loading/frame_03.png"
              alt="DonClaudio's pig mascot driving a delivery car"
              width={160}
              height={160}
              priority
              className="h-24 w-24 drop-shadow-xl sm:h-36 sm:w-36"
            />
          </div>
        </div>
      </section>

      {/* Sits on top of the hero's bottom edge. */}
      <div className="relative z-10 mx-auto -mt-16 max-w-3xl space-y-6 px-4 sm:-mt-20">
        {/* Search card */}
        <section className="rounded-3xl bg-white p-5 shadow-xl shadow-[#2d4a35]/10 sm:p-7">
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="tracking" className="text-sm font-bold text-gray-900">
              Tracking number
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div
                className={`flex flex-1 items-center gap-2 rounded-2xl border-2 bg-gray-50 px-3 transition-colors focus-within:bg-white ${
                  error
                    ? 'border-red-300 focus-within:border-red-400'
                    : looksValid
                      ? 'border-[#3c5e45]/60'
                      : 'border-gray-200 focus-within:border-[#3c5e45]'
                }`}
              >
                <Search className="h-5 w-5 shrink-0 text-gray-400" />
                <input
                  id="tracking"
                  ref={inputRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. 6650f1c2a9b3e4d5f6a7b8c9 or your order link"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'tracking-error' : undefined}
                  className="h-12 min-w-0 flex-1 bg-transparent font-mono text-sm text-gray-900 placeholder:font-sans placeholder:text-gray-400 focus:outline-none"
                />
                {input ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInput('');
                      setError(null);
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear"
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-[#3c5e45] hover:bg-[#e9f5ee]"
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    Paste
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#3c5e45] px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-[#2d4a35] hover:shadow-lg active:scale-[0.98]"
              >
                Track order
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {error ? (
              <p id="tracking-error" role="alert" className="mt-2 text-xs font-medium text-red-600">
                {error}
              </p>
            ) : looksValid && !activeId ? (
              <p className="mt-2 text-xs font-medium text-[#3c5e45]">
                Looks good — order {shortCode(extractTrackingNumber(input) ?? '')}. Press Track order.
              </p>
            ) : null}
          </form>

          {recent.length > 0 ? (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Recently tracked
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recent.map(id => (
                  <span
                    key={id}
                    className={`inline-flex items-center overflow-hidden rounded-full border text-xs font-semibold ${
                      id === activeId
                        ? 'border-[#3c5e45] bg-[#3c5e45] text-white'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => track(id)}
                      className="py-1.5 pl-3 pr-1.5 hover:underline"
                    >
                      Order {shortCode(id)}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecent(id)}
                      aria-label={`Remove order ${shortCode(id)} from recent`}
                      className="py-1.5 pl-1 pr-2 opacity-60 hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {isCustomer ? (
          <Link
            href="/customer/dashboard?tab=history"
            className="flex items-center justify-between gap-3 rounded-2xl border border-[#3c5e45]/20 bg-[#e9f5ee] px-4 py-3 text-sm font-semibold text-[#2d4a35] hover:bg-[#dcefe3]"
          >
            You&apos;re signed in — see all your orders in your dashboard.
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        ) : null}

        {/* Results */}
        {activeId ? (
          <div ref={resultsRef} className="scroll-mt-24 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-gray-600">
                Tracking <span className="font-bold text-gray-900">order {shortCode(activeId)}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Track another
                </button>
              </div>
            </div>
            <div className="-mx-4">
              <OrderTracking
                key={activeId}
                orderId={activeId}
                variant="guest"
                showTrackingNumber={false}
              />
            </div>
          </div>
        ) : (
          <section>
            <h2 className="text-center text-sm font-bold uppercase tracking-wide text-gray-500">
              Where&apos;s my tracking number?
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {HELP.map(({icon: Icon, title, body}, i) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9f5ee] text-[#2d4a35] transition-colors group-hover:bg-[#3c5e45] group-hover:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">Step {i + 1}</span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-gray-900">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">{body}</p>
                  {i === 2 && !isCustomer ? (
                    <Link
                      href="/sign-in"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#3c5e45] hover:underline"
                    >
                      Sign in <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function TrackOrderPage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f6f8f5]" />}>
      <TrackOrder />
    </Suspense>
  );
}
