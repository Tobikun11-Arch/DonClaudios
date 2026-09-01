'use client';

import {useEffect, useRef} from 'react';
import type {Notification} from '@/lib/types/notification';

let cachedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as {webkitAudioContext?: typeof AudioContext})
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!cachedContext) cachedContext = new Ctor();
  return cachedContext;
}

export function playNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  const now = ctx.currentTime;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  masterGain.connect(ctx.destination);

  const tone = (freq: number, start: number, duration: number) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  };

  tone(880, now, 0.2);
  tone(1174.66, now + 0.12, 0.3);
}

export function useNotificationSound(notifications: Notification[]) {
  const seenRef = useRef<Set<string>>(new Set());
  const firstRunRef = useRef(true);

  const ids = notifications.map(n => n._id);
  const joined = ids.join('|');

  useEffect(() => {
    if (firstRunRef.current) {
      seenRef.current = new Set(ids);
      firstRunRef.current = false;
      return;
    }
    if (seenRef.current.size === 0 && ids.length === 0) return;
    const newIds = ids.filter(id => !seenRef.current.has(id));
    if (newIds.length > 0) {
      playNotificationSound();
      seenRef.current = new Set(ids);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);
}
