# Inventory Management System — Implementation Plan

## Chosen Scope: Option B — Full Inventory Management with Movement Log

---

## Part 1: Backend — New StockMovement System

### New Model
| File | Description |
|---|---|
| `backend/api/models/StockMovement.model.ts` | Mongoose schema: `productId` (ref Product), `type` (restock \| adjustment \| spoilage \| sold), `quantity`, `previousStock`, `newStock`, `note`, `performedBy` (ref Admin), timestamps |

### New API Endpoints
| Method | Route | Auth | Description |
|---|---|---|---|
| `PATCH` | `/api/inventory/:productId/restock` | Admin | Increment stock, log movement |
| `PATCH` | `/api/inventory/:productId/adjust` | Admin | Adjust stock up/down with reason, log movement |
| `GET` | `/api/inventory/movements` | Admin | List movements (optional `?productId=` filter) |

### New Files (Backend)
| File | Purpose |
|---|---|
| `backend/api/models/StockMovement.model.ts` | Schema definition |
| `backend/api/repositories/stockMovement.repository.ts` | Data access layer |
| `backend/api/services/stockMovement.service.ts` | Business logic + stock validation |
| `backend/api/controllers/stockMovement.controller.ts` | Request handlers |
| `backend/api/dtos/stockMovement.dto.ts` | Zod validation schemas |
| `backend/api/routes/stockMovement.routes.ts` | Route definitions |

### Modified Files (Backend)
| File | Change |
|---|---|
| `backend/api/routes/index.ts` | Mount `/api/inventory` route |

---

## Part 2: Order Flow — Automatic Stock Deduction & Restoration

### The Problem
Currently, when an order is placed, product stock is **never decremented**. Over time, the `stock` field becomes inaccurate.

### Solution
Stock is deducted/restored based on **order status transitions**:

| Transition | Action |
|---|---|
| `pending → confirmed` | Deduct stock for each order item, log `sold` movement |
| `confirmed → cancelled` | Restore stock for each order item, log `adjustment` movement |
| `preparing/ready/on_the_way → cancelled` | Restore stock, log `adjustment` movement |
| `pending → cancelled` | No action (stock wasn't deducted yet) |

### Changes to Order Model
- Add field: `stockDeducted: boolean` (default: false) — tracks whether stock was already deducted for this order

### Changes to Order Repository
- Add method: `updateStockDeducted(orderId, value)` — update the stockDeducted flag

### New Admin Endpoint
| Method | Route | Auth | Description |
|---|---|---|---|
| `PATCH` | `/api/orders/:id/status` | Admin | Update order status + auto-deduct/restore stock |

### Modified Files (Backend)
| File | Change |
|---|---|
| `backend/api/models/Order.model.ts` | Add `stockDeducted: boolean` field |
| `backend/api/repositories/order.repository.ts` | Add `updateStockDeducted()` method |
| `backend/api/controllers/order.controller.ts` | Add `updateStatus` handler that calls stock deduction/restoration |
| `backend/api/routes/order.routes.ts` | Add `PATCH /:id/status` route |

### Stock Deduction Logic (in stockMovement.service.ts)
```
deductOrderStock(orderId):
  1. Find all order items for this order
  2. For each item:
     a. Get current product stock
     b. If stock < quantity → throw error (insufficient stock)
     c. Decrement product stock by quantity
     d. Create StockMovement record (type: 'sold', quantity: -qty)
  3. Set order.stockDeducted = true

restoreOrderStock(orderId):
  1. Find all order items for this order
  2. For each item:
     a. Get current product stock
     b. Increment product stock by quantity
     c. Create StockMovement record (type: 'adjustment', quantity: +qty, note: 'Order cancelled')
  3. Set order.stockDeducted = false
```

---

## Part 3: Frontend — Inventory Dashboard

### New Files (Frontend)
| File | Purpose |
|---|---|
| `frontend/lib/types/inventory.ts` | TypeScript interfaces |
| `frontend/lib/api/inventoryApi.ts` | API client functions |
| `frontend/lib/hooks/inventory/useInventory.ts` | React Query hooks |
| `frontend/features/owner/inventory/components/InventoryPage.tsx` | Main page orchestrator |
| `frontend/features/owner/inventory/components/InventoryTable.tsx` | Product stock table |
| `frontend/features/owner/inventory/components/InventoryStats.tsx` | Summary stat cards |
| `frontend/features/owner/inventory/components/RestockModal.tsx` | Restock form modal |
| `frontend/features/owner/inventory/components/AdjustModal.tsx` | Stock adjustment modal |
| `frontend/features/owner/inventory/components/MovementHistoryModal.tsx` | Movement timeline modal |
| `frontend/features/owner/inventory/hooks/useInventory.ts` | Local form/UI state |
| `frontend/features/owner/inventory/utils/stockStatus.ts` | Stock level → status helper |

### Modified Files (Frontend)
| File | Change |
|---|---|
| `frontend/app/(owner)/owner/dashboard/@inventory/page.tsx` | Replace placeholder → render InventoryPage |

---

## Stock Status Thresholds

| Stock Level | Badge Color | Label |
|---|---|---|
| `stock = 0` | Red | Out of Stock |
| `1 ≤ stock ≤ 10` | Amber/Yellow | Low Stock |
| `stock > 10` | Green | In Stock |

---

## Page Layout (Visual)

```
┌─────────────────────────────────────────────────┐
│  📦 Inventory                      [Search...] │
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Total     │ │ Low Stock│ │ Out of Stock  │  │
│  │ 24 items  │ │ 3 items  │ │ 1 item        │  │
│  └──────────┘ └──────────┘ └───────────────┘  │
│                                                 │
│  Filter: [All] [In Stock] [Low Stock] [OOS]    │
│                                                 │
│  ┌────────┬────────┬──────┬────────┬──────────┐│
│  │ Product│Cat     │Stock │ Status │ Actions  ││
│  ├────────┼────────┼──────┼────────┼──────────┤│
│  │ Lechon │Main    │  35  │ 🟢 OK  │ Restock  ││
│  │ Liempo │Pork    │   5  │ 🟡 Low │ History  ││
│  │ ...    │ ...    │  ... │ ...    │ ...      ││
│  └────────┴────────┴──────┴────────┴──────────┘│
└─────────────────────────────────────────────────┘
```

---

## Full File Change Summary

### Backend — New Files (7)
1. `backend/api/models/StockMovement.model.ts`
2. `backend/api/repositories/stockMovement.repository.ts`
3. `backend/api/services/stockMovement.service.ts`
4. `backend/api/controllers/stockMovement.controller.ts`
5. `backend/api/dtos/stockMovement.dto.ts`
6. `backend/api/routes/stockMovement.routes.ts`

### Backend — Modified Files (3)
1. `backend/api/models/Order.model.ts` — add `stockDeducted` field
2. `backend/api/repositories/order.repository.ts` — add `updateStockDeducted()`
3. `backend/api/controllers/order.controller.ts` — add `updateStatus` handler
4. `backend/api/routes/order.routes.ts` — add status update route
5. `backend/api/routes/index.ts` — mount inventory route

### Frontend — New Files (12)
1. `frontend/lib/types/inventory.ts`
2. `frontend/lib/api/inventoryApi.ts`
3. `frontend/lib/hooks/inventory/useInventory.ts`
4. `frontend/features/owner/inventory/components/InventoryPage.tsx`
5. `frontend/features/owner/inventory/components/InventoryTable.tsx`
6. `frontend/features/owner/inventory/components/InventoryStats.tsx`
7. `frontend/features/owner/inventory/components/RestockModal.tsx`
8. `frontend/features/owner/inventory/components/AdjustModal.tsx`
9. `frontend/features/owner/inventory/components/MovementHistoryModal.tsx`
10. `frontend/features/owner/inventory/hooks/useInventory.ts`
11. `frontend/features/owner/inventory/utils/stockStatus.ts`

### Frontend — Modified Files (1)
1. `frontend/app/(owner)/owner/dashboard/@inventory/page.tsx` — render actual page

---

## What Won't Change
- Existing product CRUD stays untouched
- No changes to dashboard layout or sidebar navigation