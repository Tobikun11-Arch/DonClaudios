# Site Appearance Manager — Plan

## Goal
Admins update the public website's content (hero, highlights, about, contact, promo) and brand colors — all of which are currently hardcoded. The Appearance tab shows loading skeletons mirroring the current layout while fetching, then renders editable forms. A **"Save Changes"** button persists everything via `PUT /api/settings`.

## Architecture

```
┌─ Frontend (Next.js) ──────────────────────────────────────────┐
│                                                                │
│  Dashboard Appearance Page                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [Save Changes] [Reset to Defaults]                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  ┌─ HeroSectionEditor ───────────────────────────────┐  │  │
│  │  │  Title, subtitle, CTA, background image, stats[]  │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  │  ┌─ HighlightsEditor ───────────────────────────────┐  │  │
│  │  │  Title, image list (upload / reorder / delete)   │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  ┌─ AboutEditor ────────────────────────────────────┐  │  │
│  │  │  Title, description, stats[]                     │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  ┌─ ContactEditor ──────────────────────────────────┐  │  │
│  │  │  Address, phone, email, hours                    │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  ┌─ ColorsEditor ───────────────────────────────────┐  │  │
│  │  │  Hex inputs + swatches for each brand color      │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Public Homepage (fetches same settings)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  HeroSection, Highlights, Promo, About, Contact         │  │
│  │  ← all accept props instead of hardcoded values          │  │
│  │  ← show skeleton placeholders while loading              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────── axios ──────→ Backend API ───────────────────┘
                                      │
┌─ Backend (Express + Mongoose) ──────┘──────────────────────────┐
│                                                                │
│  GET  /api/settings  → public, returns single settings doc      │
│  PUT  /api/settings  → admin-only, upserts the document        │
│                                                                │
│  SiteSetting model (single-document collection):               │
│  { hero, highlights, about, contact, colors }                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## File-by-File Breakdown

### Phase 1 — Backend (Database & API)

| # | File | Action | What |
|---|------|--------|------|
| 1 | `backend/api/models/SiteSetting.model.ts` | **Create** | Mongoose schema with all sections + colors as a single-document collection |
| 2 | `backend/api/repositories/settings.repository.ts` | **Create** | `findOrCreate()`, `update()` |
| 3 | `backend/api/services/settings.service.ts` | **Create** | Wraps repo, validation, defaults |
| 4 | `backend/api/controllers/settings.controller.ts` | **Create** | `getSettings`, `updateSettings` handlers |
| 5 | `backend/api/routes/settings.routes.ts` | **Create** | `GET /api/settings` (public), `PUT /api/settings` (admin) |
| 6 | `backend/api/routes/index.ts` | **Edit** | Add `settings` route to router |

### Phase 2 — Frontend Infrastructure

| # | File | Action | What |
|---|------|--------|------|
| 7 | `frontend/lib/types/settings.ts` | **Create** | TS interfaces for `SiteSetting`, `HeroSection`, `HighlightsSection`, `AboutSection`, `ContactSection`, `Colors` |
| 8 | `frontend/lib/api/settingsApi.ts` | **Create** | `getSettings()`, `updateSettings(data)` using httpClient |
| 9 | `frontend/lib/hooks/useSettings.ts` | **Create** | `useSettingsQuery()`, `useUpdateSettingsMutation()` with React Query |
| 10 | `frontend/features/owner/appearance/constants.ts` | **Create** | `DEFAULT_SETTINGS` object mirroring current hardcoded values |

### Phase 3 — Public Site: Make Sections Dynamic

| # | File | Action | What |
|---|------|--------|------|
| 11 | `frontend/features/home/components/HeroSection.tsx` | **Edit** | Accept props (title, subtitle, ctaText, ctaLink, bgImage, stats), add loading skeleton |
| 12 | `frontend/features/home/components/Highlights.tsx` | **Edit** | Accept props for title & images |
| 13 | `frontend/features/home/components/About.tsx` | **Edit** | Accept props for title, description, stats |
| 14 | `frontend/features/home/components/Contact.tsx` | **Edit** | Accept props for address, phone, email, hours |
| 15 | `frontend/app/(public)/page.tsx` | **Edit** | Use `useSettingsQuery()`, pass data down as props, fallback to defaults while loading |

### Phase 4 — Appearance Page Components

| # | File | Action | What |
|---|------|--------|------|
| 16 | `frontend/features/owner/appearance/components/SectionCard.tsx` | **Create** | Reusable collapsible card wrapper (title, expanded state, children) |
| 17 | `frontend/features/owner/appearance/components/HeroSectionEditor.tsx` | **Create** | Form fields: title, subtitle, CTA text/link, background image upload, stats array editor (add/remove/reorder) |
| 18 | `frontend/features/owner/appearance/components/HighlightsEditor.tsx` | **Create** | Title field + image list with upload, drag-to-reorder, delete |
| 19 | `frontend/features/owner/appearance/components/AboutEditor.tsx` | **Create** | Title, description (textarea), stats editor |
| 20 | `frontend/features/owner/appearance/components/ContactEditor.tsx` | **Create** | Address, phone, email, hours text inputs |
| 21 | `frontend/features/owner/appearance/components/ColorsEditor.tsx` | **Create** | Hex color input + visual swatch for each brand color |

### Phase 5 — Wire Up the Appearance Page

| # | File | Action | What |
|---|------|--------|------|
| 22 | `frontend/app/(owner)/owner/dashboard/@appearance/page.tsx` | **Edit** | Full page: fetch settings, skeleton loading state, render all editors in SectionCards, save handler, toast notifications |

## States Per Component

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton blocks matching the dimensions of each section's form (pulsing gray rectangles). Colors editor shows muted swatch placeholders. |
| **Loaded** | Form populated with fetched data from `GET /api/settings`. |
| **Empty/Defaults** | If no settings doc exists yet (first time), populate with `DEFAULT_SETTINGS` matching current hardcoded values. |
| **Error** | Toast/alert: "Failed to load settings. Retry?" + fallback to defaults. |
| **Saving** | Save button shows spinner, disabled. Confirmation toast on success. |
| **Save Error** | Toast: "Failed to save. Please try again." |

## Default Settings (mirrors current hardcoded content)

```ts
export const DEFAULT_SETTINGS: SiteSetting = {
  hero: {
    title: "Taste the Lechon Legacy",
    subtitle: "Experience the rich, smoky flavor of Cebu's finest lechon...",
    ctaText: "Order Now",
    ctaLink: "/order",
    backgroundImage: "/images/lechon-bg.jpg",
    stats: [
      { value: "10+", label: "Years of Service" },
      { value: "50+", label: "Menu Items" },
      { value: "1000+", label: "Happy Customers" },
    ],
  },
  highlights: { title: "Highlights", images: [] },
  about: {
    title: "Our Story",
    description: "Don Claudios has been serving the best lechon in Cebu...",
    stats: [
      { value: "10+", label: "Years" },
      { value: "50+", label: "Items" },
      { value: "1000+", label: "Customers" },
    ],
  },
  contact: {
    address: "Don Claudios Lechon, Cebu City",
    phone: "(032) 123-4567",
    email: "info@donclaudioslechon.com",
    hours: "Mon-Sun: 8:00 AM - 9:00 PM",
  },
  colors: {
    primary: "#3c5e45",
    accent: "#fbd897",
    muted: "#a4bbab",
    darkGreen: "#2d4a35",
    mediumGreen: "#4a7c59",
    lightGreen: "#b8d4c0",
    beige: "#e8dcc4",
    red: "#c30010",
  },
};
```
