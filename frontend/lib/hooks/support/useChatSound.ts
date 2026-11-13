'use client';

import {useEffect, useRef} from 'react';

/**
 * Support chat message sound: a short "pop" bubble (pitch drops quickly),
 * deliberately different from the bell's two rising chime tones in
 * useNotificationSound.ts. Generated with Web Audio, so no audio file.
 * Browsers only allow sound after the user has interacted with the page once
 * (any click / key); before that the call is silently ignored.
 */

let ctxRef: AudioContext | null = null;
let lastPlayedAt = 0;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as {webkitAudioContext?: typeof AudioContext})
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!ctxRef) ctxRef = new Ctor();
  return ctxRef;
}

function pop(ctx: AudioContext, start: number, from: number, to: number) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + 0.09);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.35, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);

  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + 0.16);
}

/** `urgent` plays a double pop so the owner can tell it apart by ear. */
export function playChatMessageSound(urgent = false) {
  // Two pollers can notice the same message a moment apart: play once.
  const nowMs = Date.now();
  if (nowMs - lastPlayedAt < 800) return;
  lastPlayedAt = nowMs;

  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const t = ctx.currentTime;
  pop(ctx, t, 1250, 620);
  if (urgent) pop(ctx, t + 0.17, 1500, 760);
}

/** Pop when a new id appears in the list (ignores what was there on mount). */
export function useChatSoundOnNewIds(ids: string[], urgent = false) {
  const seen = useRef<Set<string> | null>(null);
  const joined = ids.join('|');

  useEffect(() => {
    const current = joined ? joined.split('|') : [];
    if (seen.current === null) {
      seen.current = new Set(current);
      return;
    }
    const fresh = current.some(id => !seen.current!.has(id));
    current.forEach(id => seen.current!.add(id));
    if (fresh) playChatMessageSound(urgent);
  }, [joined, urgent]);
}

/** Pop when a count goes up (ignores the value on mount). */
export function useChatSoundOnIncrease(count: number, urgent = false, enabled = true) {
  const prev = useRef<number | null>(null);

  useEffect(() => {
    if (enabled && prev.current !== null && count > prev.current) {
      playChatMessageSound(urgent);
    }
    prev.current = count;
  }, [count, urgent, enabled]);
}
