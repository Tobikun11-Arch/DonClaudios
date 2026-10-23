'use client'

import { useEffect, useState } from 'react'
import {
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push'

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = setTimeout(() => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setIsSupported(true)
        getCurrentSubscription().then(setSubscription)
      }
    }, 0)
    return () => clearTimeout(id)
  }, [])

  const handleSubscribe = async () => {
    try {
      const sub = await subscribeToPush()
      setSubscription(sub)
    } catch (err) {
      console.error('Subscribe failed:', err)
    }
  }

  const handleUnsubscribe = async () => {
    try {
      await unsubscribeFromPush()
      setSubscription(null)
    } catch (err) {
      console.error('Unsubscribe failed:', err)
    }
  }

  const handleSendTest = async () => {
    if (!subscription || !message.trim()) return
    // Same-origin proxy path (see next.config.ts) so this request stays
    // first-party and carries auth cookies on iOS/Safari.
    const apiBase = '/api'
    await fetch(`${apiBase}/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message }),
    })
    setMessage('')
  }

  if (!isSupported) {
    return <p className="text-sm text-muted-foreground">Push notifications are not supported in this browser.</p>
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Push Notifications</h3>
      {subscription ? (
        <>
          <p className="text-sm text-muted-foreground">You are subscribed to push notifications.</p>
          <button
            onClick={handleUnsubscribe}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            Unsubscribe
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter notification message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 rounded-md border px-3 py-1.5 text-sm"
            />
            <button
              onClick={handleSendTest}
              className="rounded-md bg-[#b91c1c] px-3 py-1.5 text-sm text-white"
            >
              Send Test
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">You are not subscribed to push notifications.</p>
          <button
            onClick={handleSubscribe}
            className="rounded-md bg-[#b91c1c] px-3 py-1.5 text-sm text-white"
          >
            Subscribe
          </button>
        </>
      )}
    </div>
  )
}
