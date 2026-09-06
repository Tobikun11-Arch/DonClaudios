'use client';

const GUEST_SESSION_KEY = 'donclaudios_guest_session_id';

export function getGuestSessionId() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(GUEST_SESSION_KEY);
}

export function ensureGuestSessionId() {
  const existing = getGuestSessionId();
  if (existing) return existing;
  const id =
    'guest_' +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
}