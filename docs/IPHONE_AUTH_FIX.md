# iPhone / Safari Auth Fix

## Root cause

Auth uses `httpOnly` cookies (access + refresh + CSRF) issued by a backend on a
different origin than the frontend. Safari's Intelligent Tracking Prevention
(ITP) blocks third-party cookies by default, so on iPhone (Safari normal +
private mode, and the installed PWA) the `Set-Cookie` from `/auth/login` is
dropped / never sent back, `/auth/me` returns 401, and the user is bounced to
`/sign-in`. Android Chrome still allows third-party cookies, so it worked there.

## Fix

Make the browser talk to a single origin (the frontend) for all API calls and
proxy those requests server-side to the real backend via a Next.js rewrite.
Cookies then become first-party and ITP no longer blocks them.

## Changes

- `frontend/next.config.ts` — added `rewrites()` mapping `/api/:path*` to
  `${NEXT_PUBLIC_API_BASE_URL}/:path*`.
- `frontend/lib/api/httpClient.ts`, `frontend/lib/api/uploadApi.ts`,
  `frontend/lib/push.ts`, `frontend/components/pwa/PushNotificationManager.tsx`
  — browser base URL hard-coded to `/api` (same-origin). No env read.
- `frontend/.env.example` — documented the new (server-side proxy) role of
  `NEXT_PUBLIC_API_BASE_URL`.
- `backend/api/controllers/auth.controller.ts` — coerce `SameSite=strict` to
  `lax` (never Strict).
- `backend/.env` — `COOKIE_SAMESITE=strict` → `lax`.

## Env vars (unchanged)

- Frontend: keep `NEXT_PUBLIC_API_BASE_URL` pointing at the backend. Just redeploy
  so the rewrite ships. No new Vercel env vars.
- Backend: no changes required. Keep `NODE_ENV=production`, `COOKIE_SECURE=true`,
  `COOKIE_SAMESITE=lax` (or `none`), and CORS origins including the frontend.

## Verification checklist

- [ ] iPhone Safari (normal): login → dashboard loads, `/auth/me` returns 200.
- [ ] iPhone Safari: reload dashboard → still logged in.
- [ ] iPhone Safari (Private Browsing): login works.
- [ ] Installed PWA (Add to Home Screen): login → close → reopen → still logged in.
- [ ] Android Chrome: login works (regression check).
- [ ] Desktop Chrome/Safari/Firefox: login works.
- [ ] Network tab: `Set-Cookie` present on login response; cookies attached on `/auth/me`.
- [ ] Push notifications still subscribe/unsubscribe successfully (PWA).
- [ ] Frontend and backend builds succeed; lint passes.