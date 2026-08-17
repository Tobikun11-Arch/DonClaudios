# Site Appearance Manager — Plan (Inline Editing)

## Goal
Admins update the public website's content (hero, highlights, about, contact, footer) and brand colors — all currently hardcoded. The Appearance tab renders the **actual public page layout** with inline editing: click any text to edit it directly in place. No form boxes — the admin sees and edits the page exactly as visitors do.

**Reference pattern**: Title Fusion `/builder` at `C:\Users\Carine1989\OneDrive\Documents\Joenel_Folder\projects\title-fusion`

## Scope
- **Editable sections**: Hero, Highlights, About, Contact, Footer, Colors
- **Text + colors only** (no image uploads)
- **4 brand colors**: Primary, Accent, Text Color, Background Color

## Architecture

```
┌─ Dashboard Layout (existing) ─────────────────────────────────┐
│  Sidebar (existing)  │  Main Content Area                      │
│                      │  ┌────────────────────────────────────┐ │
│  [Dashboard]         │  │ When tab=appearance:               │ │
│  [Products]          │  │  Full-width scrollable preview     │ │
│  [Inventory]         │  │  of the public homepage            │ │
│  [Promos]            │  │  with EditableText on every node   │ │
│  [Cashiers]          │  │                                    │ │
│  [Appearance] ◄──────│──│  Hero → Highlights → Promo →       │ │
│                      │  │  About → Contact → Footer          │ │
│                      │  │                                    │ │
│                      │  │  Click any text → inline edit      │ │
│                      │  │  Colors → floating picker panel    │ │
│                      │  │  Each edit → auto-saves via API    │ │
│                      │  └────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘

┌─ Frontend ──────────────── axios ──────→ Backend API ──────────┐
│                                                                 │
│  GET  /api/settings  → public, returns single settings doc       │
│  PUT  /api/settings  → admin-only, upserts the document         │
│                                                                 │
│  SiteSetting model (single-document collection):                │
│  { hero, highlights, about, contact, footer, colors }           │
└─────────────────────────────────────────────────────────────────┘
```

## The 3 Core Editing Components

### 1. `EditableText` (port from title-fusion)
- **Resting**: renders tag with dashed `#3c5e45` outline on hover
- **Editing**: `contentEditable` with solid outline, cursor at end
- **Enter** to save, **Escape** to cancel, **blur** to save
- Shows "..." while saving
- Accepts `tag` prop (`h1`, `h2`, `h3`, `h4`, `p`, `span`) to match heading level

### 2. `AppearancePreview` (full page preview)
- `'use client'` component that recreates the `/` layout
- Each section uses the same Tailwind classes as the public components
- All text nodes wrapped in `<EditableText>`
- Maintains local `useState` for optimistic updates
- Saves on each edit immediately (no save button)

### 3. `ColorPickerPanel` (floating)
- Fixed-position collapsible panel (bottom-right corner)
- Shows 4 color swatches with hex input fields
- Changes apply instantly to preview via CSS variables
- Toggle open/close with a paint palette icon button

## File-by-File Breakdown

### Phase 1 — Inline Editing UI (what the admin sees)

| # | File | Action | What |
|---|------|--------|------|
| 1 | `frontend/features/owner/appearance/components/EditableText.tsx` | **Create** | Port from title-fusion, adapt outline color to `#3c5e45` |
| 2 | `frontend/features/owner/appearance/components/ColorPickerPanel.tsx` | **Create** | Floating panel with 4 color swatches + hex inputs |
| 3 | `frontend/features/owner/appearance/components/AppearancePreview.tsx` | **Create** | Full page preview recreating `/` layout with EditableText wrapping all text |
| 4 | `frontend/app/(owner)/owner/dashboard/@appearance/page.tsx` | **Edit** | Render AppearancePreview full-width |
| 5 | `frontend/app/(owner)/owner/dashboard/layout.tsx` | **Edit** | Remove padding when tab=appearance |

### Phase 2 — Backend (Database & API)

| # | File | Action | What |
|---|------|--------|------|
| 6 | `backend/api/models/SiteSetting.model.ts` | **Create** | Mongoose schema with all sections + 4 colors as a single-document collection |
| 7 | `backend/api/repositories/settings.repository.ts` | **Create** | `findOrCreate()`, `update()` |
| 8 | `backend/api/services/settings.service.ts` | **Create** | Wraps repo, validation, defaults |
| 9 | `backend/api/controllers/settings.controller.ts` | **Create** | `getSettings`, `updateSettings` handlers |
| 10 | `backend/api/routes/settings.routes.ts` | **Create** | `GET /api/settings` (public), `PUT /api/settings` (admin) |
| 11 | `backend/api/routes/index.ts` | **Edit** | Add `settings` route to router |

### Phase 3 — Frontend Data Layer

| # | File | Action | What |
|---|------|--------|------|
| 12 | `frontend/lib/types/settings.ts` | **Create** | TS interfaces for `SiteSetting`, `HeroSection`, `HighlightsSection`, `AboutSection`, `ContactSection`, `FooterSection`, `Colors` |
| 13 | `frontend/lib/api/settingsApi.ts` | **Create** | `getSettings()`, `updateSettings(data)` using httpClient |
| 14 | `frontend/lib/hooks/useSettings.ts` | **Create** | `useSettingsQuery()`, `useUpdateSettingsMutation()` with React Query |
| 15 | `frontend/features/owner/appearance/constants.ts` | **Create** | `DEFAULT_SETTINGS` object mirroring current hardcoded values |

### Phase 4 — Make Public Homepage Dynamic

| # | File | Action | What |
|---|------|--------|------|
| 16 | `frontend/features/home/components/HeroSection.tsx` | **Edit** | Accept props (title, subtitle, ctaText, ctaLink, stats), fallback to defaults |
| 17 | `frontend/features/home/components/Highlights.tsx` | **Edit** | Accept props for title & subtitle |
| 18 | `frontend/features/home/components/About.tsx` | **Edit** | Accept props for title, description, stats |
| 19 | `frontend/features/home/components/Contact.tsx` | **Edit** | Accept props for address, phone, email, hours |
| 20 | `frontend/shared/components/layout/Footer.tsx` | **Edit** | Accept props for brand name, description, phone, email, address |
| 21 | `frontend/app/(public)/page.tsx` | **Edit** | Use `useSettingsQuery()`, pass data down as props, fallback to defaults while loading |

## States Per Component

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton blocks matching each section's shape (pulsing gray rectangles). Color picker shows muted swatch placeholders. |
| **Loaded** | Preview rendered with fetched data from `GET /api/settings`. All text nodes are clickable for editing. |
| **Empty/Defaults** | If no settings doc exists yet (first time), populate with `DEFAULT_SETTINGS` matching current hardcoded values. |
| **Error** | Toast/alert: "Failed to load settings. Retry?" + fallback to defaults. |
| **Editing (text)** | Click text → contentEditable with dashed outline → Enter/blur to save → "..." indicator → toast on success. |
| **Editing (colors)** | Floating panel open → click swatch or hex input → color changes instantly in preview → auto-saves. |
| **Save Error** | Toast: "Failed to save. Please try again." Reverts optimistic update. |

## Layout Modification

The current dashboard layout wraps content in `<div className="px-6 py-6">`. For the appearance tab, we need full-width rendering so the preview looks like the real page:

```tsx
// In layout.tsx, conditionally remove padding:
<main className="flex-1 overflow-y-auto bg-gray-50 pb-24 md:pb-0">
  {tab === 'appearance' ? (
    <>{appearance}</>
  ) : (
    <div className="px-6 py-6">
      {tab && slotByTab[tab] ? slotByTab[tab] : children}
    </div>
  )}
</main>
```

## Default Settings (mirrors current hardcoded content)

```ts
export const DEFAULT_SETTINGS: SiteSetting = {
  hero: {
    title: "Authentic Filipino Lechon",
    subtitle: "Slow-roasted to perfection with crispy golden skin and juicy, tender meat. Every celebration deserves the best.",
    ctaText: "Place Your Order",
    ctaLink: "/order",
    stats: [
      { value: "1000+", label: "Happy Customers" },
      { value: "Daily", label: "Fresh Lechon" },
      { value: "10 Yrs", label: "Experience" },
    ],
  },
  highlights: {
    title: "Visit Our DonClaudio's Lechon House",
    subtitle: "Located in the heart of Tanza, Cavite. Come experience our warm hospitality and taste the tradition.",
  },
  about: {
    title: "Our Story",
    description: "DonClaudio's Lechon House has been serving Tanza, Cavite with authentic Filipino lechon for years. We're passionate about bringing families together with food that celebrates our rich culinary heritage. Every lechon is carefully prepared using time-honored recipes and slow-roasted over open flames to achieve that perfect balance of crispy skin and succulent meat. We source only the finest ingredients because your celebrations deserve nothing less.",
    stats: [
      { value: "100%", label: "Fresh & Quality" },
      { value: "Daily", label: "Roasted Fresh" },
    ],
  },
  contact: {
    address: "Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza, Philippines, 4108",
    phones: ["+63 915 5321 169", "+63 939 2587 229"],
    email: "support@donclaudio.com",
    hours: "Tue - Sun, 10:00 AM - 10:00 PM",
  },
  footer: {
    brandName: "DonClaudio's Lechon House",
    description: "The place of extraordinary taste of Lechon and great food — DonClaudio's!",
    phones: ["09155321169", "09392587229"],
    email: "lcnpau@yahoo.com",
    address: "Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza, Cavite, Philippines 4108",
    hours: "Open: 10:00 AM - 10:00 PM (Tue-Sun)",
  },
  colors: {
    primary: "#3c5e45",
    accent: "#fbd897",
    textColor: "#3c5e45",
    backgroundColor: "#ffffff",
  },
};
```

## Default Colors (4 editable)

| Key | Current Hex | Usage |
|-----|------------|-------|
| `primary` | `#3c5e45` | Main green — buttons, text, headings |
| `accent` | `#fbd897` | Gold/beige — highlights, badges, CTA buttons |
| `textColor` | `#3c5e45` | Main text color (same as primary currently) |
| `backgroundColor` | `#ffffff` | Default background for sections |

## Key Design Decisions

1. **Inline editing, not form boxes** — admin clicks text directly on the page preview to edit, like browsing the real site but with edit capability
2. **Single-document pattern** — one `SiteSetting` doc in MongoDB (no multiple records)
3. **Defaults fallback** — if no settings doc exists yet (first time), use `DEFAULT_SETTINGS` matching current hardcoded values
4. **GET is public** — homepage fetches without auth; PUT requires admin auth
5. **Auto-save on each edit** — no global save button; each inline edit saves immediately on blur/Enter
6. **Optimistic updates** — local state updates instantly, API call fires in background
7. **No image uploads** — images stay hardcoded for now
8. **Footer included** — editable description, contact numbers, email, address
9. **Loading states** — skeleton blocks matching each section's shape while fetching

## What Changed from Original Plan

| Original (form boxes) | Revised (inline editing) |
|----------------------|------------------------|
| SectionCard (collapsible) | **Removed** — no cards, the page IS the editor |
| HeroSectionEditor (form) | **Removed** — text edited inline in AppearancePreview |
| HighlightsEditor (form) | **Removed** — same |
| AboutEditor (form) | **Removed** — same |
| ContactEditor (form) | **Removed** — same |
| FooterEditor (form) | **Removed** — same |
| ColorsEditor (form card) | **Replaced** with floating ColorPickerPanel |
| Save button at top | **Removed** — each edit saves immediately on blur |
