feat/settings-profile
admin

but followed the profile page of customer account



# Settings Page — Design Reference

Minimal, standard layout. No custom/creative styling — reuse existing design system (colors, fonts, spacing, button styles) already used across the app.

---

## Page Structure

```
[Page Title: "Settings"]
[Subtitle: "Manage your profile, business, security, and team."]

[Horizontal Tab Bar]
  Profile & Business Info | Security | Team
  ------------------------

[Tab Content Area — changes based on active tab]
```

- Tab bar style: match the existing tab pattern already used in the app (active tab = colored text + underline, inactive = muted gray text, no underline).
- Default active tab on load: **Profile & Business Info**.
- Tabs are client-side switches — no full page reload.

---

## Tab 1: Profile & Business Info

Two stacked sections on one scrollable page, separated by spacing or a divider line.

### Section A — "Your Profile"
| Field | Type |
|---|---|
| Profile photo | Image upload + circular preview |
| Full name | Text input |
| Email | Text input |
| Phone number | Text input |
| Username | Text input |

- [Save Changes] button, right-aligned, bottom of section.

### Section B — "Business Details"
| Field | Type |
|---|---|
| Business/store name | Text input |
| Business logo | Image upload + preview (square/rect) |
| Store address | Text input |
| Business contact number | Text input |
| Operating hours | Text input (e.g. "Mon–Sun, 8AM–8PM") |
| Business type | Text input or dropdown |

- [Save Changes] button, right-aligned, bottom of section.

**Layout:** single column, form fields full-width within a max content width (match existing form width used elsewhere in the app, e.g. cashier edit form). No side-by-side multi-column fields — keep it simple and stacked.

---

## Tab 2: Security

Single column, stacked cards/sections.

### Section A — "Change Password"
| Field | Type |
|---|---|
| Current password | Password input |
| New password | Password input |
| Confirm new password | Password input |

- [Update Password] button, right-aligned.

### Section B — "Login Activity"
- List/table of active sessions:
  - Device
  - Location / IP
  - Last active
- [Log out of other devices] button, below the list.

**Layout:** two clearly separated cards or bordered sections, stacked vertically. No tabs-within-tabs.

---

## Tab 3: Team

Reuses the existing Cashiers Management UI, unchanged, just relocated here.

```
[Search bar: "Search cashiers by name, email, or username"]     [+ Add Cashier]

[Card Grid — 3 columns on desktop, responsive to 1 column on mobile]
  Each card:
    - Avatar icon
    - Name + @username
    - Status badge (Online/Offline), top-right of card
    - Email (with icon)
    - Phone (with icon)
    - Address (with icon)
    - [Edit] [Delete] buttons, side by side, full-width split
```

- Keep existing card style, spacing, and button colors exactly as currently implemented — no restyling needed.

---

## General Rules

- No extra tabs, no Billing, no Notifications tab.
- No decorative elements — plain, functional, minimal.
- Consistent max-width container across all 3 tabs (don't let Team's grid stretch wider than Profile/Security's form width, unless that's already the existing pattern).
- Reuse existing input, button, and card components already built in the app — do not create new styled variants.