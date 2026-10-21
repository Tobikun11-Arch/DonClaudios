# PWA Plan — DonClaudio's Lechon House (Next.js)

**Status:** Phases 0–6 implemented (manifest, icons, service worker, offline page, install prompt, push scaffolding, security headers). Phases 7–8 (testing/deployment) remain.

Reference: https://nextjs.org/docs/app/guides/progressive-web-apps

This plan adds Progressive Web App (PWA) capabilities to the **frontend** (`frontend/`), a Next.js 16 App Router app. The backend (Express) will only gain endpoints needed for push subscription persistence (Phase 5).

**Scope note:** DonClaudio's has 3 user roles (customer, owner, cashier). PWA is most valuable for **customers** (install to home screen, browse menu offline, order-status push). Owner/cashier dashboards remain online-first but still installable.

---

## Phase 0 — Audit & Prerequisites

**Goal:** Confirm baseline before writing PWA code.

- [ ] App is deployed over HTTPS (Vercel already provides this in prod; local dev needs `next dev --experimental-https` for push testing).
- [ ] Confirm `metadataBase` in `app/layout.tsx` is correct (already `https://don-claudios.vercel.app`).
- [ ] Inventory icon assets: currently only `public/assets/logo.png`. Need a **square source PNG ≥ 512×512** and generate icon set:
  - `public/icons/icon-192x192.png`
  - `public/icons/icon-512x512.png`
  - `public/icons/icon-maskable-192x192.png` (maskable, safe-zone)
  - `public/icons/icon-maskable-512x512.png`
  - `public/icons/apple-touch-icon.png` (180×180)
  - `public/icons/favicon-32x32.png`
  - `public/icons/badge-72x72.png` (push badge)
- [ ] Decide installability scope: customers only vs. all roles. (Recommend: all roles installable; push notifications customer-first.)
- [ ] Add `web-push` to backend deps (Phase 5) and generate VAPID keys (Phase 5).

**Acceptance:** Icon set exists in `public/icons/`; HTTPS confirmed; no code changes yet.

---

## Phase 1 — Web App Manifest

**Goal:** Make the app installable ("Add to Home Screen").

**Files:**
- Create `frontend/app/manifest.ts` (typed via `MetadataRoute.Manifest`).

**Content (adapted to DonClaudio's):**
```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DonClaudio's Lechon House",
    short_name: 'DonClaudio',
    description: "Order lechon and traditional Filipino cuisine online.",
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#b91c1c', // brand red (adjust to actual)
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

- [ ] Update `app/layout.tsx` metadata: add `themeColor`, `appleWebApp`, `viewport` theme color, and `manifest` is auto-linked by Next.js when `app/manifest.ts` exists.
- [ ] Add `apple-touch-icon` link in metadata icons (already points at logo; switch to `/icons/apple-touch-icon.png`).
- [ ] Verify `/manifest.webmanifest` is served and Lighthouse "Installable" passes.

**Acceptance:** Chrome DevTools → Application → Manifest shows no errors; "Add to Home Screen" prompt available on mobile.

---

## Phase 2 — Service Worker (Basic / Install + Activate)

**Goal:** Register a service worker that caches the app shell for offline launch.

**Files:**
- Create `frontend/lib/service-worker.js` (vanilla JS, as docs example).
- Create `frontend/components/pwa/ServiceWorkerRegistrar.tsx` (client component) that registers the SW on mount, or use inline registration.

**Registration pattern (from docs):**
```ts
navigator.serviceWorker.register('/service-worker.js', { scope: '/', updateViaCache: 'none' })
```

**SW skeleton:**
```js
const CACHE_NAME = 'donclaudios-v1'
const PRECACHE = ['/', '/offline', '/assets/logo.png' /* ... */]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)))
  self.skipWaiting()
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  )
  self.clients.claim()
})
```

- [ ] Add `public/offline.html` or `app/offline/page.tsx` fallback.
- [ ] Keep SW scope `/` and disable caching of SW itself (handled in Phase 6 headers).
- [ ] Version cache name on each deploy; clean old caches on activate.

**Acceptance:** SW registered in DevTools; offline reload shows cached shell instead of browser offline page.

---

## Phase 3 — Offline Support & Caching Strategies

**Goal:** Graceful offline experience for customers browsing menu.

**Strategy:**
- **App shell & static assets** (JS/CSS/fonts/images): Cache-First.
- **API GET (menu, categories, promos)**: Stale-While-Revalidate (serve cached, refresh in background).
- **API mutations (order, checkout, auth)**: Network-Only; queue failed requests with Background Sync (optional, advanced).
- **Navigation requests offline:** serve `/offline` fallback page.

**Implementation options:**
- Option A (docs-recommended): Serwist (`@serwist/next`) — provides Next.js integration for both Turbopack & webpack, precaching manifest auto-generated. Recommended for production-grade.
- Option B: Hand-rolled SW with manual cache logic (simpler, matches docs example). Good for capstone MVP.

**Recommendation:** Start with Option B for Phase 2–3 MVP; migrate to Serwist if offline reliability becomes a grading criterion.

**Files:**
- `frontend/lib/service-worker.js` — add fetch handler with strategy routing.
- `frontend/app/offline/page.tsx` — "You're offline" page with cached menu? (optional).
- Use Next.js experimental `useOffline` hook for connectivity-aware UI (docs: "Extending your PWA" → Offline Support). Config: `experimental.useOffline` in `next.config.ts`.

- [ ] Add connectivity banner component in shared layout (shows "Offline — showing cached data").
- [ ] Disable cart checkout button when offline; show toast.
- [ ] Test with DevTools Network → Offline.

**Acceptance:** Menu still visible offline (cached); checkout disabled; no white screen.

---

## Phase 4 — Install UX

**Goal:** Friendly install prompt across browsers (incl. iOS Safari, which has no `beforeinstallprompt`).

**Files:**
- Create `frontend/components/pwa/InstallPrompt.tsx` (client component) — from docs example, adapted:
  - Detect iOS via UA.
  - Detect standalone mode via `display-mode: standalone` media query.
  - Show iOS instructions ("tap Share → Add to Home Screen").
  - Use `beforeinstallprompt` for Chrome/Edge/Android to trigger native prompt via a button (enhancement; docs note it's not cross-platform — keep as progressive enhancement).
- Mount `InstallPrompt` in root layout or a PWA provider, but **only for customer-facing/public routes**? Decision: show globally but suppress on admin routes? Recommend: show on public + customer routes; hide on owner/cashier dashboards to avoid clutter (optional). Simpler: global, dismissible, persisted in localStorage.

- [ ] Persist dismissal so prompt doesn't nag.
- [ ] Add a manual "Install app" entry in footer/settings.

**Acceptance:** On iOS Safari (real device or simulator) user sees install instructions; on Chrome Android the native install prompt triggers.

---

## Phase 5 — Push Notifications

**Goal:** Re-engage customers with order status / promo notifications.

**Backend changes (Express):**
- [ ] Add `PushSubscription` model (fields: `endpoint`, `keys.p256dh`, `keys.auth`, `userId` optional, `createdAt`).
- [ ] Routes: `POST /api/push/subscribe`, `POST /api/push/unsubscribe`, `POST /api/push/send` (admin/owner only).
- [ ] Store VAPID keys in backend `.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:...`.
- [ ] Install `web-push` in backend.

**Frontend:**
- [ ] Create `frontend/lib/actions.ts` (Server Actions) per docs: `subscribeUser`, `unsubscribeUser`, `sendNotification` — but pointing at backend API instead of in-memory. (Since backend is separate, implement as API calls via axios, not Server Actions storing in memory.)
- [ ] VAPID public key exposed via `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- [ ] Create `frontend/components/pwa/PushNotificationManager.tsx` (client) — feature-detect `serviceWorker` + `PushManager`; subscribe/unsubscribe; test send (dev only).
- [ ] Extend `lib/service-worker.js` with `push` and `notificationclick` handlers (from docs §5). `notificationclick` opens the relevant order URL (e.g., `/customer/dashboard?order=<id>` or order confirmation page).
- [ ] Add opt-in UI: prompt after first successful order (not on first visit) to avoid permission fatigue.
- [ ] Backend triggers push on order status change (preparing → ready → out for delivery) and new promos.

**Acceptance:** Subscribed user receives a push on order status change; clicking notification opens the order page; unsubscribe works.

---

## Phase 6 — Security Headers & Hardening

**Goal:** Secure the PWA per docs §8.

**Files:**
- Edit `frontend/next.config.ts` `headers()`:
  - Global: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - `/service-worker.js` (or `/sw.js`): `Content-Type: application/javascript; charset=utf-8`, `Cache-Control: no-cache, no-store, must-revalidate`, CSP `default-src 'self'; script-src 'self'`.
  - `/manifest.webmanifest`: appropriate content-type + cache.
- [ ] HTTPS-only cookies / secure flags if auth uses cookies (check current auth mechanism — likely JWT in localStorage; document).
- [ ] Validate push message origin in SW (only accept from own backend).

**Acceptance:** Security headers present in response; Lighthouse best-practices score high; no mixed content.

---

## Phase 7 — Testing

**Goal:** Validate PWA quality.

- [ ] Local HTTPS: `npm run dev -- --experimental-https`.
- [ ] Chrome DevTools → Application: Manifest, Service Workers, Cache Storage, Push.
- [ ] Lighthouse PWA audit (target: all PWA checks pass; performance ≥ 80).
- [ ] Cross-browser: Chrome (Android/desktop), Safari (iOS/macOS), Firefox, Edge.
- [ ] Offline test matrix: airplane mode on real device; slow 3G.
- [ ] Push test: subscribe → trigger from backend → receive → click → correct route.
- [ ] Install test on iOS (real device required for accurate behavior).

**Acceptance:** Lighthouse PWA category all green; documented test results in `PWA-TEST-RESULTS.md`.

---

## Phase 8 — Deployment & Rollout

**Goal:** Ship safely.

- [ ] Add env vars to Vercel (frontend): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- [ ] Add env vars to backend host: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- [ ] Run `npm run build` locally to catch type errors (SW registration types).
- [ ] Rollout strategy: enable manifest + SW first (installable), push behind feature flag / opt-in.
- [ ] Monitor: service worker update flow (skipWaiting + clients.claim) must not break active sessions; consider "New version available — reload" toast.
- [ ] Document rollback: remove SW registration + delete caches.

**Acceptance:** Production deploy installable; push opt-in available; rollback documented.

---

## File Map (planned)

```
frontend/
├── app/
│   ├── manifest.ts                      (Phase 1)
│   ├── offline/page.tsx                 (Phase 3)
│   └── layout.tsx                       (Phase 1, 4 metadata)
├── components/pwa/
│   ├── ServiceWorkerRegistrar.tsx       (Phase 2)
│   ├── InstallPrompt.tsx                (Phase 4)
│   └── PushNotificationManager.tsx      (Phase 5)
├── lib/
│   ├── service-worker.js                (Phase 2, 3, 5)
│   └── actions.ts                       (Phase 5)
├── public/
│   └── icons/...                        (Phase 0)
└── next.config.ts                       (Phase 3, 6)
backend/
├── api/models/PushSubscription.model.ts (Phase 5)
└── api/routes/push.routes.ts            (Phase 5)
```

## Dependencies to add

- Frontend: none required for MVP (vanilla SW). Optional: `@serwist/next` + `serwist` (Phase 3 upgrade).
- Backend: `web-push`.

## Out of scope (future)

- Background Sync for offline order queueing.
- Periodic background sync for menu refresh.
- File System Access API.
- Native app store (TWA) packaging.

## Open questions for you

1. Should push notifications be customer-only, or also notify owners/cashiers of new orders?
2. Do you want offline menu browsing, or is installability + push enough for the capstone grade?
3. Brand theme color (currently guessed `#b91c1c`) — confirm hex.
4. Icon source: do you have a high-res square logo, or should I generate from `public/assets/logo.png`?