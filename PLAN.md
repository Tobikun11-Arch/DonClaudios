# Plan: Admin CRUD for Cashiers

---

## Overview

Implement full CRUD for cashiers in the Owner Dashboard (`/owner/dashboard?tab=cashiers`). Currently:
- **Backend**: Only `POST /api/cashiers` exists (create). Missing list, get, update, delete.
- **Frontend**: Placeholder `<div>` at `@cashiers/page.tsx`. No types, API functions, hooks, or components.

---

## Part 1 — Backend

### 1.1 `api/repositories/cashier.repository.ts`
Add:
- `listAll()` → `CashierModel.find({}).sort({createdAt: -1}).exec()`
- `updateById(id, data)` → `CashierModel.findByIdAndUpdate(id, data, {new: true}).exec()`
- `deleteById(id)` → `CashierModel.findByIdAndDelete(id).exec()`

### 1.2 `api/dtos/cashier.dto.ts`
- Add `updateCashierDto` = partial of create (all fields optional, password optional)

### 1.3 `api/services/cashier.service.ts`
Add:
- `listCashiers()` — calls `cashierRepository.listAll()`
- `getCashier(id)` — calls `findById`, throws 404 if not found
- `updateCashier(id, data)` — check email/username uniqueness if changed, hash password if provided, call `updateById`
- `deleteCashier(id)` — calls `deleteById`, throws 404 if not found

### 1.4 `api/controllers/cashier.controller.ts`
Add handlers: `list`, `getById`, `update`, `remove`

### 1.5 `api/routes/cashier.routes.ts`
| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/` | — | list |
| GET | `/:id` | — | getById |
| POST | `/` | requireAuth + requireAdmin | create (exists) |
| PATCH | `/:id` | requireAuth + requireAdmin | update |
| DELETE | `/:id` | requireAuth + requireAdmin | remove |

---

## Part 2 — Frontend

### 2.1 `lib/types/cashier.ts`
```ts
export type Cashier = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber?: string;
  address?: string;
  isOnline: boolean;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
};
export type ListCashiersResponse = { cashiers: Cashier[] };
export type GetCashierResponse = { cashier: Cashier };
export type CreateCashierBody = {
  firstName: string; lastName: string; email: string;
  password: string; username: string;
  phoneNumber?: string; address?: string;
};
export type CreateCashierResponse = { id: string; email: string; username: string };
export type UpdateCashierBody = Partial<CreateCashierBody>;
export type UpdateCashierResponse = { cashier: Cashier };
export type DeleteCashierResponse = { message: string };
```

### 2.2 `lib/types/cashiers.ts` (form state)
```ts
export type CashierFormState = {
  firstName: string; lastName: string; email: string;
  username: string; password: string;
  phoneNumber: string; address: string;
};
export const emptyCashierForm: CashierFormState = {
  firstName: '', lastName: '', email: '', username: '',
  password: '', phoneNumber: '', address: ''
};
```

### 2.3 `lib/api/cashiersApi.ts`
`listCashiers()` GET, `getCashier(id)` GET, `createCashier(body)` POST, `updateCashier({id,body})` PATCH, `deleteCashier(id)` DELETE

### 2.4 `lib/hooks/cashiers/useCashiers.ts`
React Query hooks: `useCashiersQuery`, `useCashierQuery`, `useCreateCashierMutation`, `useUpdateCashierMutation`, `useDeleteCashierMutation` — same pattern as `useProducts.ts`

### 2.5 `features/owner/cashiers/hooks/useCashierForm.ts`
`resetForm()`, `loadForm(cashier)`, `validateAndGetPayload(mode)` — no image logic

### 2.6 `features/owner/cashiers/components/`
| File | Purpose |
|------|---------|
| `Modal.tsx` | Base modal wrapper |
| `CashiersPage.tsx` | Main page (query, loading/error/empty, search, cards, modals) |
| `CashiersHeader.tsx` | Title + "Add Cashier" button |
| `CashiersFilters.tsx` | Search bar (name/email/username) |
| `CashierCard.tsx` | Card: name, email, username, phone, online badge, Edit/Delete + skeleton |
| `CashierFormModal.tsx` | Form: firstName, lastName, email, username, password†, phoneNumber, address — no image |
| `DeleteCashierModal.tsx` | Delete confirmation |

> † password: required on create, optional on edit with "Leave blank to keep current"

### 2.7 Update `@cashiers/page.tsx`
Replace `<div>` with import of `CashiersPageContent`

---

## Key Design Decisions
1. **No image upload** — Cashier model has no image field
2. **No category filter** — just text search across name/email/username
3. **Password** — required only on create; optional on edit
4. **Status badge** — show `isOnline` (green/gray) instead of `isAvailable`
5. **Follow product pattern exactly** — same folder structure, naming, React Query pattern
