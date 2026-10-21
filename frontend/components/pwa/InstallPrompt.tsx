'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const wasDismissed = localStorage.getItem('pwa-install-dismissed') === '1'

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const id = setTimeout(() => {
      setIsIOS(
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
          !(window as unknown as { MSStream?: unknown }).MSStream
      )
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone ===
            true
      )
      setDismissed(wasDismissed)
      // Show iOS instructions after a short delay if not standalone
      if (
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !window.matchMedia('(display-mode: standalone)').matches
      ) {
        const t = setTimeout(() => setVisible(true), 3000)
        // cleanup handled by outer? store not needed
        void t
      }
    }, 0)

    return () => {
      clearTimeout(id)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  if (isStandalone || dismissed) return null
  if (!visible && !isIOS) return null

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
    setVisible(false)
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-lg border bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold">Install DonClaudio&apos;s</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add to your home screen for faster access and an app-like experience.
          </p>
          {isIOS && (
            <p className="mt-2 text-sm">
              On iOS: tap the Share button{' '}
              <span aria-label="share icon">⎋</span> then &quot;Add to Home
              Screen&quot; <span aria-label="plus icon">➕</span>.
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="rounded-md bg-[#b91c1c] px-3 py-1.5 text-sm text-white"
          >
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
