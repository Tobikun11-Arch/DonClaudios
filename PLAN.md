# DonClaudio's — Dashboard Tab Design Spec

## Overview

**Product:** DonClaudio's Lechon House — Owner Dashboard  
**Tab:** Dashboard (default landing view after login)  
**Job:** Give the owner an instant pulse check — sales today, revenue trend, inventory health, top products, and stock alerts — without requiring any navigation.

---

## Color Tokens

| Name | Hex | Usage |
|---|---|---|
| `--bg-base` | `#F5F4F0` | Page background |
| `--surface` | `#FFFFFF` | Cards and panels |
| `--brand-dark` | `#2D4A1E` | Sidebar, header accents, primary labels |
| `--brand-mid` | `#4A7C35` | Icon fills, active states, trend indicators |
| `--brand-light` | `#E8F0E3` | Subtle card tints, hover states |
| `--accent-amber` | `#D4860A` | Low stock alert border and icon |
| `--accent-amber-bg` | `#FEF7EC` | Low stock alert background |
| `--text-primary` | `#1A1A1A` | Headings and values |
| `--text-secondary` | `#6B7280` | Subtitles, labels, helper text |
| `--text-positive` | `#2D7A3A` | Positive delta values (e.g. +12.5%) |
| `--divider` | `#E5E7EB` | Table rows, card borders |

---

## Typography

- **Display / Large Numbers:** `font-weight: 700`, `font-size: 1.5rem` — used for stat values (₱28,125, 247, etc.)
- **Card Label:** `font-weight: 500`, `font-size: 0.75rem`, `text-transform: uppercase`, `letter-spacing: 0.08em`, `color: var(--text-secondary)`
- **Section Title:** `font-weight: 600`, `font-size: 1rem`, `color: var(--text-primary)`
- **Section Subtitle:** `font-weight: 400`, `font-size: 0.8rem`, `color: var(--text-secondary)`
- **Body / Table:** `font-weight: 400`, `font-size: 0.875rem`
- **Delta Badge:** `font-weight: 500`, `font-size: 0.75rem`, `color: var(--text-positive)`

Font family: System sans-serif stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)

---

## Layout Structure

The dashboard content area (right of sidebar) is a single scrollable column with consistent `24px` horizontal padding and `20px` vertical gaps between sections.

```
┌──────────────────────────────────────────────────┐
│  Dashboard                                        │
│  Welcome back, Owner                              │
├──────────┬──────────┬──────────┬──────────────────┤
│ Today's  │  Total   │ Products │   Customers      │  ← Stat Cards Row
│  Sales   │ Revenue  │ In Stock │                  │
├──────────┴──────────┴──────────┴──────────────────┤
│                                                   │
│  ┌──────────────────────┐  ┌────────────────────┐ │
│  │  Sales Trend         │  │ Inventory by       │ │  ← Two-column panel
│  │  (Last 7 Days)       │  │ Category           │ │
│  │  [Line Chart]        │  │ [Donut Chart]      │ │
│  └──────────────────────┘  └────────────────────┘ │
│                                                   │
│  ┌───────────────────────────────────────────────┐│
│  │  Top Selling Products                         ││  ← Full-width table
│  │  [Ranked table: Rank | Product | Units | ₱]   ││
│  └───────────────────────────────────────────────┘│
│                                                   │
│  ┌───────────────────────────────────────────────┐│
│  │  ⚠ Low Stock Alert                            ││  ← Alert banner
│  │  3 items running low. Restock soon.           ││
│  │  Cochinillo 3–4kg • Lechon Belly 1kg • Sisig  ││
│  └───────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

---

## Section Specs

### Page Header

- **Title:** "Dashboard" — `font-size: 1.5rem`, `font-weight: 700`, `color: var(--text-primary)`
- **Subtitle:** "Welcome back, Owner" — `font-size: 0.875rem`, `color: var(--text-secondary)`
- Margin bottom: `20px`

---

### Stat Cards Row

Four equal-width cards in a `grid` with `gap: 16px`, `grid-template-columns: repeat(4, 1fr)`.

Each card:
- Background: `var(--surface)`
- Border: `1px solid var(--divider)`
- Border radius: `12px`
- Padding: `16px 20px`
- Box shadow: `0 1px 3px rgba(0,0,0,0.06)`

Card anatomy (top-to-bottom):
1. **Label** — e.g. "Today's Sales" (card label style)
2. **Value** — e.g. "₱28,125" (display style)
3. **Delta or context** — e.g. "+12.5% from yesterday" (delta badge style, `color: var(--text-positive)`) OR "Last 7 days" / "In Stock" / "+24 this week" (`color: var(--text-secondary)`)
4. **Icon** — right-aligned, `32px` circle, `background: var(--brand-light)`, icon `color: var(--brand-mid)`

Cards:

| Label | Value | Context | Icon |
|---|---|---|---|
| Today's Sales | ₱28,125 | +12.5% from yesterday | Trend arrow |
| Total Revenue | ₱185,125 | Last 7 days | Peso/coin |
| Products | 38 | In Stock | Box/package |
| Customers | 247 | +24 this week | Person |

---

### Sales Trend Chart (Last 7 Days)

- **Title:** "Sales Trend (Last 7 Days)"
- **Subtitle:** "Daily sales performance"
- Card: same surface style as stat cards
- Width: ~60% of the two-column row
- Chart type: Smooth line chart (monotone curve)
- Line color: `var(--brand-mid)`
- Fill: light green gradient under the line (`var(--brand-light)` to transparent)
- Y-axis: peso values (₱5,000 – ₱30,000), labels in `var(--text-secondary)`
- X-axis: dates (Feb 3 – Feb 9), same label style
- Tooltip on hover: dark pill showing date + `Sales: ₱25,900` style
- Grid lines: subtle `var(--divider)` horizontal lines only

---

### Inventory by Category (Donut Chart)

- **Title:** "Inventory by Category"
- **Subtitle:** "Stock distribution"
- Card: same surface style
- Width: ~40% of the two-column row
- Chart type: Donut chart, center label shows dominant category name + count (e.g. "Cochinillo / 45")

Segment colors:

| Category | Color |
|---|---|
| Cochinillo | `#2D4A1E` (brand-dark) |
| Lechon de leche | `#4A7C35` (brand-mid) |
| Lechon Belly | `#7BAF5A` |
| Traditional | `#A8CC8C` |
| Appetizers | `#D4A843` |
| Rice Meals | `#E8C87A` |
| Pasta | `#C9B99A` |
| Drinks | `#E5DDD0` |

- Legend: right side, small color swatch + category name, `font-size: 0.75rem`

---

### Top Selling Products Table

- **Title:** "Top Selling Products"
- **Subtitle:** "Best performers this month"
- Star icon (favorite/pin) top-right of card — `color: var(--text-secondary)`, outline style
- Full-width card, same surface style
- Table columns: `Rank | Product | Units Sold | Revenue`
- Column alignment: Rank centered, Product left, Units Sold right, Revenue right
- Rank badge: `28px` circle, `background: var(--brand-dark)`, `color: white`, `font-weight: 600`, `font-size: 0.75rem`
- Row dividers: `1px solid var(--divider)`
- Row hover: `background: var(--brand-light)`
- Padding per row: `12px 16px`

| Rank | Product | Units Sold | Revenue |
|---|---|---|---|
| 1 | Traditional Lechon 9–11kg | 45 | ₱337,500 |
| 2 | Lechon Belly 2kg | 38 | ₱62,700 |
| 3 | Cochinillo 5–6kg | 32 | ₱208,000 |
| 4 | Lechon Kawali with Rice | 89 | ₱16,020 |
| 5 | Chicken BBQ with Rice | 76 | ₱12,160 |

---

### Low Stock Alert Banner

- Background: `var(--accent-amber-bg)`
- Left border: `4px solid var(--accent-amber)`
- Border radius: `10px`
- Padding: `14px 18px`
- Icon: warning triangle, `color: var(--accent-amber)`, `20px`, left-aligned
- **Heading:** "Low Stock Alert" — `font-weight: 600`, `color: var(--text-primary)`
- **Body:** "3 items are running low on stock. Restock soon to avoid shortages." — `font-size: 0.875rem`, `color: var(--text-secondary)`
- **Item tags:** Cochinillo 3–4kg • Lechon Belly 1kg • Sisig — `font-weight: 600`, `color: var(--accent-amber)`, separated by bullet `•`

---

## Spacing System

| Token | Value |
|---|---|
| Section gap | `20px` |
| Card padding | `16px 20px` |
| Card border-radius | `12px` |
| Table row padding | `12px 16px` |
| Content horizontal padding | `24px` |
| Chart panel gap | `16px` |

---

## Responsive Notes

- **≥ 1024px:** Two-column chart row, four-column stat cards
- **768px – 1023px:** Stat cards 2×2 grid, chart panels stack vertically
- **< 768px:** All sections full-width, single column

---

## Backend Data Layer

### Data Sources (Existing Models)

| Model | Key Fields Used | Dashboard Section |
|---|---|---|
| `Order` | `totalAmount`, `orderStatus`, `createdAt` | Stat Cards, Sales Trend |
| `OrderItem` | `orderId`, `productId`, `quantity`, `price` | Top Selling Products |
| `Product` | `name`, `category`, `stock`, `isAvailable` | Products Stat, Inventory Donut, Low Stock Alert |
| `Customer` | `createdAt` | Customers Stat |
| `PerformanceDaily` | `date`, `totalRevenue`, `topProducts` | Sales Trend (backfill/alt source) |

### New Backend Files (2)

| File | Purpose |
|---|---|
| `backend/api/controllers/dashboard.controller.ts` | 5 aggregation handlers (uses `OrderModel`, `ProductModel`, etc. directly — no service layer needed for read-only aggregations) |
| `backend/api/routes/dashboard.routes.ts` | Route definitions with `requireAuth`, `requireAdmin` middleware (same pattern as `product.routes.ts`, `stockMovement.routes.ts`) |

### Modified Backend Files (1)

| File | Change |
|---|---|
| `backend/api/routes/index.ts` | Add `app.use('/api/dashboard', dashboardRoutes)` |

### API Endpoints

#### `GET /api/dashboard/summary` — Stat Cards

Aggregates four metrics + deltas in one request:

```ts
// Response shape — every string is returned by the API, nothing hardcoded in frontend
{
  cards: [
    {
      key: "todaySales",
      label: "Today's Sales",
      value: 28125,
      delta: 12.5,
      deltaLabel: "vs yesterday"           // formatted from computed delta
    },
    {
      key: "totalRevenue",
      label: "Total Revenue",
      value: 185125,
      context: "Last 7 days"               // reflects actual query range, not hardcoded
    },
    {
      key: "productsInStock",
      label: "Products",
      value: 38,
      context: "In Stock"
    },
    {
      key: "customers",
      label: "Customers",
      value: 247,
      context: "+24 this week"             // computed from DB, not hardcoded
    }
  ]
}
```

**Aggregation logic:**
- `todaySales.value` → `Order.aggregate` match `createdAt >= startOfToday && orderStatus != 'cancelled'`, `$sum: totalAmount`
- `todaySales.delta` → same query for yesterday's range, compute `((today - yesterday) / yesterday) * 100`; `deltaLabel` always `"vs yesterday"`
- `totalRevenue.value` → `Order.aggregate` match `createdAt >= 7 days ago && orderStatus != 'cancelled'`, `$sum: totalAmount`; `context` built from the `days` param (e.g. `"Last ${days} days"`)
- `productsInStock.value` → `Product.countDocuments({ stock: { $gt: 0 }, isAvailable: true })`; `context` always `"In Stock"`
- `customers.value` → `Customer.countDocuments()`
- `customers.context` → compute `newThisWeek = Customer.countDocuments({ createdAt: { $gte: startOfWeek } })`, format as `"+${newThisWeek} this week"`

#### `GET /api/dashboard/sales-trend?days=7` — Line Chart Data

```ts
// Response shape
{
  days: [
    { date: "Feb 3", revenue: 25900 },
    { date: "Feb 4", revenue: 21200 },
    // ...
  ]
}
```

**Aggregation logic:**
- `Order.aggregate` with pipeline:
  ```
  { $match: { createdAt: { $gte: N days ago }, orderStatus: { $ne: 'cancelled' } } },
  { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalAmount' } } },
  { $sort: { _id: 1 } }
  ```
- Fill in missing days with zero revenue

#### `GET /api/dashboard/inventory-by-category` — Donut Chart Data

```ts
// Response shape
{
  categories: [
    { category: "Cochinillo", count: 45 },
    { category: "Lechon de leche", count: 30 },
    // ...
  ],
  dominant: { category: "Cochinillo", count: 45 }
}
```

**Aggregation logic:**
- `Product.aggregate` match `isAvailable: true`, `$group: { _id: '$category', count: { $sum: '$stock' } }`, sort descending
- `dominant` = first entry (highest count)

#### `GET /api/dashboard/top-products?limit=5` — Top Products Table

```ts
// Response shape
{
  products: [
    { rank: 1, productId, name: "Traditional Lechon 9–11kg", unitsSold: 45, revenue: 337500 },
    // ...
  ]
}
```

**Aggregation logic:**
- `OrderItem.aggregate` with pipeline:
  ```
  { $lookup: { from: 'orders', localField: 'orderId', foreignField: '_id', as: 'order' } },
  { $unwind: '$order' },
  { $match: { 'order.orderStatus': { $in: ['completed', 'delivered'] }, 'order.createdAt': { $gte: startOfMonth } } },
  { $group: { _id: '$productId', unitsSold: { $sum: '$quantity' }, revenue: { $sum: { $multiply: ['$quantity', '$price'] } } } },
  { $sort: { unitsSold: -1 } },
  { $limit: 5 },
  { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
  { $unwind: '$product' },
  { $project: { name: '$product.name', unitsSold: 1, revenue: 1 } }
  ```

#### `GET /api/dashboard/low-stock?threshold=10` — Alert Banner

```ts
// Response shape
{
  count: 3,
  items: [
    { productId, name: "Cochinillo 3–4kg", stock: 3 },
    { name: "Lechon Belly 1kg", stock: 5 },
    { name: "Sisig", stock: 2 }
  ]
}
```

**Query logic:**
- `Product.find({ stock: { $gt: 0, $lte: threshold }, isAvailable: true }).select('name stock').sort({ stock: 1 })`
- `count` = result length

---

## Frontend Data Layer

### New Frontend Files (3)

| File | Purpose |
|---|---|
| `frontend/lib/types/dashboard.ts` | TypeScript interfaces matching API responses |
| `frontend/lib/api/dashboardApi.ts` | Axios/fetch client wrapping all 5 endpoints |
| `frontend/lib/hooks/dashboard/useDashboard.ts` | 5 React Query hooks (or 1 composite hook) |

### New Frontend Feature Files (6)

| File | Purpose |
|---|---|
| `frontend/features/owner/dashboard/components/DashboardPage.tsx` | Page orchestrator — fetches all data, renders sections |
| `frontend/features/owner/dashboard/components/StatCard.tsx` | Single stat card (label, value, delta/context, icon) |
| `frontend/features/owner/dashboard/components/SalesTrendChart.tsx` | Line chart with tooltip, 7-day x-axis |
| `frontend/features/owner/dashboard/components/InventoryDonut.tsx` | Donut chart with center label + legend |
| `frontend/features/owner/dashboard/components/TopProductsTable.tsx` | Ranked table with badge, hover state |
| `frontend/features/owner/dashboard/components/LowStockAlert.tsx` | Amber banner with tagged item list |

### Modified Frontend Files (1)

| File | Change |
|---|---|
| `frontend/app/(owner)/owner/dashboard/page.tsx` | Replace placeholder with `import DashboardPage from '@/features/owner/dashboard/components/DashboardPage'` (same pattern as `@inventory/page.tsx`) |

### Types (`frontend/lib/types/dashboard.ts`)

```ts
export interface StatCardData {
  key: string;             // unique id: "todaySales" | "totalRevenue" | "productsInStock" | "customers"
  label: string;           // display title, e.g. "Today's Sales"
  value: number;
  delta?: number;          // percentage change, e.g. 12.5
  deltaLabel?: string;     // e.g. "vs yesterday"
  context?: string;        // e.g. "Last 7 days", "+24 this week", "In Stock"
}

export interface DashboardSummary {
  cards: StatCardData[];
}

export interface SalesDay {
  date: string;
  revenue: number;
}

export interface CategoryStock {
  category: string;
  count: number;
}

export interface InventoryByCategory {
  categories: CategoryStock[];
  dominant: { category: string; count: number };
}

export interface TopProduct {
  rank: number;
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface LowStockItem {
  productId: string;
  name: string;
  stock: number;
}

export interface LowStockAlert {
  count: number;
  items: LowStockItem[];
}
```

### API Client (`frontend/lib/api/dashboardApi.ts`)

```ts
// 5 exported functions:
getDashboardSummary(): Promise<DashboardSummary>
getSalesTrend(days?: number): Promise<{ days: SalesDay[] }>
getInventoryByCategory(): Promise<InventoryByCategory>
getTopProducts(limit?: number): Promise<{ products: TopProduct[] }>
getLowStock(threshold?: number): Promise<LowStockAlert>
```

### React Query Hooks (`frontend/lib/hooks/dashboard/useDashboard.ts`)

- `useDashboardSummary()` — `useQuery({ queryKey: ['dashboard', 'summary'], queryFn: () => getDashboardSummary() })`
- `useSalesTrend(days?)` — `useQuery({ queryKey: ['dashboard', 'sales-trend', days], ... })`
- `useInventoryByCategory()` — `useQuery(...)`
- `useTopProducts(limit?)` — `useQuery(...)`
- `useLowStock(threshold?)` — `useQuery(...)`

Each hook returns `{ data, isLoading, error }` — components render loading skeletons, error states, or the real data.

---

## Data Flow Per Component

| Component | Hook | Endpoint | Renders |
|---|---|---|---|---|
| `<StatCard>` × 4 | `useDashboardSummary()` | `GET /api/dashboard/summary` | Iterates `cards[]` — `label`, `value`, `delta`/`context` — **all strings from API** |
| `<SalesTrendChart>` | `useSalesTrend(7)` | `GET /api/dashboard/sales-trend?days=7` | Line chart with tooltip |
| `<InventoryDonut>` | `useInventoryByCategory()` | `GET /api/dashboard/inventory-by-category` | Donut chart + legend |
| `<TopProductsTable>` | `useTopProducts(5)` | `GET /api/dashboard/top-products?limit=5` | Ranked table rows |
| `<LowStockAlert>` | `useLowStock(10)` | `GET /api/dashboard/low-stock?threshold=10` | Amber banner + tags |

---

## Component Checklist

- [ ] `<StatCard>` — label, value, delta/context, icon
- [ ] `<SalesTrendChart>` — line chart with tooltip, 7-day x-axis
- [ ] `<InventoryDonut>` — donut chart with center label + legend
- [ ] `<TopProductsTable>` — ranked rows with badge, hover state
- [ ] `<LowStockAlert>` — amber banner with tagged item list
- [ ] Dashboard layout grid (responsive)

## Data Layer Checklist

- [ ] `backend/api/controllers/dashboard.controller.ts` — 5 aggregation handlers
- [ ] `backend/api/routes/dashboard.routes.ts` — route definitions
- [ ] `backend/api/routes/index.ts` — mount dashboard routes
- [ ] `frontend/lib/types/dashboard.ts` — TypeScript interfaces
- [ ] `frontend/lib/api/dashboardApi.ts` — API client functions
- [ ] `frontend/lib/hooks/dashboard/useDashboard.ts` — React Query hooks
- [ ] `frontend/app/(owner)/owner/dashboard/page.tsx` — wire components + hooks
