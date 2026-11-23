'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {AlertTriangle, Phone, X} from 'lucide-react';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {useEscapeKey} from '@/shared/motion/useEscapeKey';

const PROFILE_HREF = '/customer/dashboard?tab=profile#verify-phone';
const SEEN_KEY = 'dc_phone_prompt_seen';

/**
 * Google accounts start without a verified phone, and the store needs one to
 * take an order. Shows a banner under the header until it's done, plus a
 * one-time pop-up per browser session right after sign-in.
 */
export function PhoneVerifyBanner() {
  const me = useMeQuery();
  const user = me.data?.user;
  // Read once on mount: was the pop-up already shown in this browser session?
  const [seenBefore] = useState(() => {
    try {
      return typeof window !== 'undefined' && !!sessionStorage.getItem(SEEN_KEY);
    } catch {
      return false;
    }
  });
  const [dismissed, setDismissed] = useState(false);
  const needs = user?.type === 'customer' && user.needsPhoneVerification === true;
  const popupOpen = needs && !seenBefore && !dismissed;

  useEffect(() => {
    if (!popupOpen) return;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Storage blocked: it shows again on the next page load, which is fine.
    }
  }, [popupOpen]);

  const setPopupOpen = (open: boolean) => setDismissed(!open);
  useEscapeKey(popupOpen, () => setPopupOpen(false));

  if (!needs) return null;

  return (
    <>
      <div
        role="status"
        className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">Verify your phone number to place orders.</span>
        <Link
          href={PROFILE_HREF}
          className="rounded-lg bg-[#3c5e45] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2d4a35]"
        >
          Verify
        </Link>
      </div>

      {popupOpen ? (
        <div className="fixed inset-0 z-[1100] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={() => setPopupOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="phone-prompt-title"
            className="relative w-full rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-sm sm:rounded-2xl dark:bg-gray-900"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setPopupOpen(false)}
              className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e9f5ee] text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]">
              <Phone className="h-5 w-5" />
            </span>
            <h2 id="phone-prompt-title" className="mt-3 text-lg font-bold text-gray-900 dark:text-gray-100">
              Verify your phone number to start ordering
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              You signed in with Google, so we don&apos;t have a verified number yet. Our team calls it to
              confirm orders.
            </p>
            <div className="mt-5 flex gap-2">
              <Link
                href={PROFILE_HREF}
                onClick={() => setPopupOpen(false)}
                className="flex-1 rounded-lg bg-[#3c5e45] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#2d4a35]"
              >
                Verify now
              </Link>
              <button
                type="button"
                onClick={() => setPopupOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** True while a Google account still has to verify a phone before ordering. */
export function usePhoneVerificationRequired() {
  const me = useMeQuery();
  const user = me.data?.user;
  return user?.type === 'customer' && user.needsPhoneVerification === true;
}

/** Short line under a disabled checkout / place-order button. */
export function PhoneGateNotice({className = ''}: {className?: string}) {
  const required = usePhoneVerificationRequired();
  if (!required) return null;
  return (
    <p
      role="status"
      className={`flex items-center justify-center gap-1.5 text-center text-xs text-amber-800 dark:text-amber-300 ${className}`}
    >
      <Phone className="h-3.5 w-3.5 shrink-0" />
      <span>
        Verify your phone in your profile to order.{' '}
        <Link href={PROFILE_HREF} className="font-semibold underline">
          Verify now
        </Link>
      </span>
    </p>
  );
}
