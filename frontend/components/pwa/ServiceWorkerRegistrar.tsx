'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    // Avoid registering during dev HMR issues? Register always in prod; in dev it's fine.
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        // Check for updates periodically
        setInterval(() => registration.update(), 60 * 60 * 1000)
      })
      .catch((err) => {
        console.error('Service worker registration failed:', err)
      })
  }, [])

  return null
}
