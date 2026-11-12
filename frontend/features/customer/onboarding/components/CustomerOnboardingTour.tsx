'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {ArrowLeft, ArrowRight, X} from 'lucide-react';
import {useMeQuery, meQueryKey} from '@/lib/hooks/auth/useMeQuery';
import {completeOnboardingTour} from '@/lib/api/authApi';

/**
 * First-login guide for the customer dashboard ("coach marks").
 *
 * Each step dims the screen, cuts a highlighted box around one part of the UI
 * and shows a card with "2 / 6", Back, Next and Skip. It appears automatically
 * the first time a customer opens the dashboard, and never again once they
 * finish OR skip it: the result is saved on their account (server), so it
 * stays dismissed on every device. Add `?tour=1` to the dashboard URL to replay
 * it (handy for demos).
 */

type Step = {
  /** `data-tour` value of the element to highlight; null = centered card. */
  target: string | null;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    target: 'nav-order',
    title: 'Order from our menu',
    body: 'This is your home. Browse the menu, tap a dish to see details and add it to your cart.'
  },
  {
    target: 'cart',
    title: 'Your cart',
    body: 'Review what you picked, choose pick-up or delivery, then check out here.'
  },
  {
    target: 'order-history',
    title: 'Track your orders',
    body: 'See the live status of your current orders and everything you ordered before.'
  },
  {
    target: 'notifications',
    title: 'Notifications',
    body: 'We let you know here when your order is confirmed, ready, or when we reply to you.'
  },
  {
    target: 'nav-rewards',
    title: 'Earn rewards',
    body: 'Every completed order earns points. Redeem them for treats in Rewards.'
  },
  {
    target: 'support',
    title: 'Need help? Chat with us',
    body: 'Pick a message type (choose Urgent for time-sensitive problems) or check the quick FAQs for instant answers.'
  }
];

const PAD = 8; // space around the highlighted element
const CARD_W = 300;
const localKey = (userId: string) => `dc-onboarding-tour-done:${userId}`;

function findVisibleTarget(name: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function readLocalDone(userId: string) {
  try {
    return window.localStorage.getItem(localKey(userId)) === '1';
  } catch {
    return false;
  }
}

export default function CustomerOnboardingTour() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {data} = useMeQuery();
  const user = data?.user;

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({w: 0, h: 0});

  const replay = searchParams.get('tour') === '1';
  // Only on the main Order tab: the cart and history buttons live there.
  const onOrderTab =
    pathname === '/customer/dashboard' && !searchParams.get('tab');

  // Decide whether to start.
  useEffect(() => {
    if (!user || user.type !== 'customer' || !onOrderTab) return;
    const shouldShow =
      replay || (user.onboardingTourDone === false && !readLocalDone(user.id));
    if (!shouldShow) return;
    // Let the menu and buttons render before measuring them.
    const t = setTimeout(() => {
      setIndex(0);
      setActive(true);
    }, 700);
    return () => clearTimeout(t);
  }, [user, onOrderTab, replay]);

  const step = STEPS[index];

  const measure = useCallback(() => {
    setViewport({w: window.innerWidth, h: window.innerHeight});
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = findVisibleTarget(step.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  // Bring the target into view, then measure it.
  useEffect(() => {
    if (!active || !step) return;
    const el = step.target ? findVisibleTarget(step.target) : null;
    el?.scrollIntoView({block: 'center', behavior: 'smooth'});
    const raf = requestAnimationFrame(measure);
    const t = setTimeout(measure, 350); // after smooth scroll settles
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [active, step, measure]);

  useEffect(() => {
    if (!active) return;
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, measure]);

  const finish = useCallback(
    async (outcome: 'completed' | 'skipped') => {
      setActive(false);
      if (!user) return;
      try {
        window.localStorage.setItem(localKey(user.id), '1');
      } catch {
        // storage unavailable: the server flag below still covers it
      }
      try {
        await completeOnboardingTour(outcome);
        await queryClient.invalidateQueries({queryKey: meQueryKey});
      } catch {
        // Local flag already stops it showing again on this device.
      }
    },
    [user, queryClient]
  );

  // Keyboard: Esc = skip, arrows = navigate.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish('skipped');
      if (e.key === 'ArrowRight') {
        if (index < STEPS.length - 1) setIndex(i => i + 1);
        else finish('completed');
      }
      if (e.key === 'ArrowLeft' && index > 0) setIndex(i => i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, index, finish]);

  // Where to put the card: below the highlight if there is room, else above;
  // centered when the step has no target (or it is not on screen).
  const cardStyle = useMemo<React.CSSProperties>(() => {
    const width = Math.min(CARD_W, viewport.w - 32);
    if (!rect) {
      return {
        width,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }
    const left = Math.min(
      Math.max(16, rect.left + rect.width / 2 - width / 2),
      viewport.w - width - 16
    );
    const spaceBelow = viewport.h - rect.bottom;
    if (spaceBelow > 220) {
      return {width, left, top: rect.bottom + PAD + 12};
    }
    return {width, left, bottom: viewport.h - rect.top + PAD + 12};
  }, [rect, viewport]);

  if (!active || !step) return null;

  const isLast = index === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[1350]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tour-title"
    >
      {/* Dimmed backdrop with a "hole" around the highlighted element. */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-4 ring-[#7ed4a0] transition-all duration-300 ease-out"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.62)'
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}
      {/* Click-catcher so the page underneath cannot be used mid-tour. */}
      <div className="absolute inset-0" />

      <div
        className="absolute rounded-2xl bg-white p-4 shadow-2xl transition-all duration-300 ease-out dark:bg-gray-900 dark:ring-1 dark:ring-gray-700"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-full bg-[#eef4ef] px-2 py-0.5 text-[11px] font-bold text-[#2d4a35] dark:bg-[#7ed4a0]/15 dark:text-[#7ed4a0]">
            {index + 1} / {STEPS.length}
          </span>
          <button
            onClick={() => finish('skipped')}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            Skip <X size={12} />
          </button>
        </div>

        <h2
          id="onboarding-tour-title"
          className="mt-2 text-base font-bold text-gray-900 dark:text-gray-100"
        >
          {index === 0 && user?.firstName
            ? `Welcome, ${user.firstName}! `
            : ''}
          {step.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {step.body}
        </p>

        {/* Progress dots */}
        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? 'w-5 bg-[#2d4a35] dark:bg-[#7ed4a0]'
                  : 'w-1.5 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:invisible dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={13} /> Back
          </button>
          <button
            onClick={() =>
              isLast ? finish('completed') : setIndex(i => i + 1)
            }
            className="flex items-center gap-1 rounded-full bg-[#2d4a35] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#3a5c44]"
            autoFocus
          >
            {isLast ? 'Got it!' : 'Next'}
            {!isLast && <ArrowRight size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}
