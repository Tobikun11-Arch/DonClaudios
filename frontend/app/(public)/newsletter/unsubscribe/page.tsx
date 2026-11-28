'use client';

import {Suspense, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {unsubscribeNewsletter} from '@/lib/api/accountSecurityApi';

type Status = 'working' | 'done' | 'error';

function Unsubscribe() {
  const token = useSearchParams().get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'working' : 'error');
  const started = useRef(false);

  // The email link is the one click: unsubscribe as soon as the page opens.
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    unsubscribeNewsletter(token)
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[#f6f8f5] px-4 py-16 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
        {status === 'working' ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">Unsubscribing…</p>
        ) : status === 'done' ? (
          <>
            <h1 className="text-lg font-bold text-[#2d4a35] dark:text-[#7ed4a0]">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              You won&apos;t get newsletter emails from us anymore. Order updates are not affected. You can
              subscribe again anytime in your account settings.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">This link didn&apos;t work</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              The unsubscribe link is invalid or incomplete. Sign in and turn off the newsletter in your account
              settings instead.
            </p>
          </>
        )}
        <Link
          href="/"
          className="mt-5 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#3c5e45] px-4 text-sm font-semibold text-white hover:bg-[#2d4a35]"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={<main className="min-h-[60vh] bg-[#f6f8f5] dark:bg-gray-950" />}>
      <Unsubscribe />
    </Suspense>
  );
}
