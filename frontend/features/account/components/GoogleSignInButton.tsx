'use client';

import {useEffect, useRef, useState} from 'react';

type GoogleIdApi = {
  initialize: (config: {
    client_id: string;
    callback: (response: {credential?: string}) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    el: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with';
      shape?: 'rectangular' | 'pill';
      width?: number;
      logo_alignment?: 'left' | 'center';
    }
  ) => void;
};

declare global {
  interface Window {
    google?: {accounts?: {id?: GoogleIdApi}};
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

let scriptPromise: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Google's own "Continue with Google" button (Google Identity Services). It
 * hands back an ID token (`credential`) that the backend verifies. Renders
 * nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.
 */
export function GoogleSignInButton({
  onCredential,
  text = 'continue_with',
  disabled = false
}: {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        const api = window.google?.accounts?.id;
        const el = containerRef.current;
        if (cancelled || !api || !el) return;
        api.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: response => {
            if (response.credential) callbackRef.current(response.credential);
          },
          ux_mode: 'popup',
          cancel_on_tap_outside: true
        });
        el.innerHTML = '';
        api.renderButton(el, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'center',
          width: Math.min(400, el.offsetWidth || 400)
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!GOOGLE_CLIENT_ID) return null;
  if (failed) {
    return <p className="text-center text-xs text-muted-foreground">Google sign-in is unavailable right now.</p>;
  }
  return (
    <div
      ref={containerRef}
      aria-disabled={disabled}
      className={`flex min-h-[44px] w-full justify-center ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    />
  );
}
