# Xendit Payment Gateway — Replacement Plan

Replaces the manual payment flow (owner-defined channels → customer uploads a
screenshot → cashier verifies) with Xendit. Xendit itself tells the backend
that an order is paid, so the cashier no longer checks screenshots.

---

## 1. Decisions (agreed)

| Topic | Decision |
|---|---|
| When payment opens | Same as now: only after the cashier marks the order **confirmed**. |
| How the customer pays | Xendit **Invoice**, a hosted checkout page. The customer is redirected to `invoice_url`, pays, and is sent back to the tracking page. |
| How the cashier knows | The Xendit **webhook** (`PAID`) marks the order paid and notifies cashiers (in-app and push). The manual verify step is removed. |
| Preparing gate | **Mark as preparing** stays locked until the order is paid (fully or by down payment). The exception is **pickup + cash on pickup**. |
| Cash | **Pickup orders only** ("cash on pickup"). Delivery orders must pay online. |
| Pre-orders | The customer picks **full** or **50% down payment** before going to Xendit. The cashier sees a "Down payment" label. |
| Down payment balance | The **customer chooses**: cash on pickup, or a second Xendit link. |
| Unpaid orders | The invoice expires and the order is **auto-cancelled** (stock restored, customer and cashier notified). Expiry is **30 min** for regular orders and **24 h** for pre-orders. |
| Refunds | **Automatic via the Xendit Refund API** when a paid order is cancelled. If the refund fails, the owner is alerted to refund it manually. |
| Owner Settings → Payment tab | **Deleted entirely**, along with everything tied to it. |
| Credentials | New env vars are added with empty values. Joenel fills them in later. |
| Delivery fee | **None.** `deliveryFee` is always 0. Lechon orders (the 4 lechon categories) or subtotal ≥ ₱3,000 → `DONCLAUDIO` delivery, free. Everything else → `LALAMOVE`, where the customer books and pays the rider directly. So the amount charged online is the order total only. |
| Down payment base | 50% of `totalAmount`, rounded **up** to the whole peso. The balance is the rest. |
| Xendit transaction fee | **Passed to the customer** and shown as its own line, e.g. *Order ₱300 + Transaction fee ₱8 = ₱308*. See section 1.1. |
| Allowed channels | **GCash, Maya, GrabPay, ShopeePay, cards.** These are the channels Xendit can refund by API. Bank transfer and over-the-counter options are left out. |

### Still open (default applies unless changed)
- **Delivery pre-order balance:** cash is pickup-only, so a *delivery*
  pre-order paid by down payment pays the balance online with a second Xendit
  link. Default: **online only.**

### 1.1 Transaction fee
Xendit's fee depends on the channel, so the customer **picks the channel in our
UI first**. We then compute the fee and create an invoice limited to that one
channel. The customer sees the exact fee before being sent to Xendit.

Published PH rates (verify on xendit.co/en-ph/pricing before going live; card
rate not confirmed on Xendit's own page). All except ShopeePay exclude 12% VAT,
which is charged on the fee:

| Channel | Rate | VAT on fee |
|---|---|---|
| GCash | 2.3% | +12% |
| Maya | 1.8% | +12% |
| GrabPay | 2.0% | +12% |
| ShopeePay | 2.0% | included |
| Card (local) | 3.2% + ₱10 | +12% |

The rates live in one editable file, `backend/api/config/paymentFees.ts`. The
frontend gets the computed fees from the API, and the backend always
recomputes the fee at checkout, so the customer can't tamper with it.

**Formula.** The fee is "grossed up" so the store still receives the full order
amount after Xendit takes its cut. A plain `300 × 2.3%` would leave the store
slightly short because Xendit charges on the fee too.

```
effectiveRate = rate × (vatIncluded ? 1 : 1.12)
effectiveFixed = fixed × (vatIncluded ? 1 : 1.12)
charge = ceil( (amount + effectiveFixed) / (1 − effectiveRate) )   // whole peso
transactionFee = charge − amount
```
Example: ₱300 via GCash → effective rate 2.576% → charge ₱308, fee ₱8.

- The down payment and the balance each get their own fee, computed on their own amount.
- **Refunds** return the full amount the customer paid, **fee included**.
- **Reports** keep using `totalAmount` (fees are not revenue). The fee is
  stored separately as `transactionFee`.

---

## 2. New order lifecycle

```
pending ──(cashier confirms)──► confirmed
                                   │
         customer picks how to pay ┤
   ┌───────────────────────────────┼───────────────────────────────┐
   │ Online full                   │ Online 50% DP (pre-order)     │ Cash on pickup (pickup only)
   │ → Xendit invoice (100%)       │ → Xendit invoice (50%)        │ → no invoice
   │ PAID webhook → paid           │ PAID webhook → down_payment   │ paymentChoice = cash_on_pickup
   │ EXPIRED → order cancelled     │ EXPIRED → order cancelled     │
   └───────────────┬───────────────┴───────────────┬───────────────┘
                   ▼                               ▼
     cashier can click "Mark as preparing" (gate opens)
                   │
                   ▼
   ready / on_the_way ──► completed
     • DP + balance online : 2nd invoice must be PAID before on_the_way (delivery) / completed (pickup)
     • DP + balance cash   : cashier clicks "Cash received" before completed
     • Cash on pickup      : cashier clicks "Cash received" before completed (existing mark-paid)

cancelled (by staff) at any point:
     • pending invoices → expired at Xendit
     • PAID payments    → refund created via API → refund webhook → refunded / refund_failed
```

Customers can still only cancel while the order is **pending** (current rule),
so a refund only ever comes from a **staff** cancel.

---

## 3. Backend changes (`backend/`)

### 3.1 Environment — `api/config/env.ts` and `.env.example`
All optional so the server still boots before keys exist. Payment endpoints
return `503 PAYMENTS_NOT_CONFIGURED` when the key is missing.

```
# Xendit (test keys start with xnd_development_)
XENDIT_SECRET_KEY=
XENDIT_WEBHOOK_TOKEN=          # Dashboard → Settings → Webhooks → "Verification token"
XENDIT_API_BASE_URL=https://api.xendit.co
FRONTEND_URL=                  # e.g. https://donclaudios.vercel.app (used for redirect URLs)
PAYMENT_EXPIRY_MINUTES=30
PREORDER_PAYMENT_EXPIRY_HOURS=24
```

### 3.2 New files
| File | Purpose |
|---|---|
| `api/services/xendit.service.ts` | Thin client using `fetch` with Basic auth (secret key as username), so no SDK dependency. Functions: `createInvoice`, `getInvoice`, `expireInvoice`, `createRefund`. |
| `api/config/paymentFees.ts` | Channel fee table plus `computeCharge(amount, channel)` → `{amount, transactionFee, charge}`. |
| `api/models/Payment.model.ts` | One document per Xendit invoice: `orderId`, `kind` (`full` / `down_payment` / `balance`), `channel`, `amount` (order portion), `transactionFee`, `charge` (amount + fee, what Xendit bills), `externalId`, `xenditInvoiceId`, `invoiceUrl`, `status` (`PENDING` / `PAID` / `EXPIRED` / `REFUND_PENDING` / `REFUNDED` / `REFUND_FAILED`), `channel`, `paidAt`, `expiresAt`, `refundId`. |
| `api/repositories/payment.repository.ts` | CRUD plus **atomic** status transitions (`{status: 'PENDING'}` → `PAID`), so webhook retries are idempotent. |
| `api/services/payment.service.ts` | Business rules: start checkout, apply webhook, balance choice, handle cancel (expire or refund), recompute the order's payment summary. |
| `api/controllers/payment.controller.ts` + `api/routes/payment.routes.ts` | HTTP layer (see 3.4). |

### 3.3 Order model — `api/models/Order.model.ts`
- **Add:** `paymentChoice` (`online_full` / `online_down_payment` /
  `cash_on_pickup`), `balanceChoice` (`cash` / `online` / null), `amountPaid`,
  `refundStatus` (`none` / `pending` / `refunded` / `failed`), `paymentChannel`,
  `transactionFee` (sum of fees paid; not counted as revenue).
- **Keep:** `paymentStatus` (`unpaid` / `down_payment` / `paid`), `paymentMethod`,
  `paidAt`, `paidBy`.
- **Remove:** `paymentVerified`, `paymentProofUrl`, `paymentNote`. Old orders
  keep these fields in Mongo, but the code stops reading or writing them.

### 3.4 Endpoints
| Method & path | Who | What |
|---|---|---|
| `GET /api/orders/:id/payment` | customer / guest / staff | Payment summary: what is due, allowed options, **per-channel fee quotes** (`quotes.full / down_payment / balance`), the open invoice and payment history. The UI shows fees from these quotes, so the frontend has no copy of the fee table. |
| `POST /api/orders/:id/payment/checkout` body `{kind: 'full' \| 'down_payment', channel}` | customer / guest (same access check as tracking) | Order must be `confirmed` and unpaid. `down_payment` is only allowed for pre-order-only carts (reuses `orderContainsRegularProduct`). Computes the fee server-side, expires any older PENDING invoice, then creates a new one for `charge` limited to that channel and returns `{invoiceUrl}`. |
| `POST /api/orders/:id/payment/cash` | customer / guest | **Kept** (cash on pickup). Sets `paymentChoice = cash_on_pickup`. No fee. |
| `POST /api/orders/:id/payment/balance` body `{method: 'cash' \| 'online', channel?}` | customer / guest | Only after the down payment is PAID. `online` creates the balance invoice (with its own fee) and returns `{invoiceUrl}`. `cash` is pickup only. |
| `PATCH /api/orders/:id/payment/mark-paid` | staff | **Kept**. The cashier records cash received (cash on pickup or cash balance). |
| `POST /api/webhooks/xendit/invoice` | Xendit | Rejects with 401 unless `x-callback-token` equals `XENDIT_WEBHOOK_TOKEN`. Re-fetches the invoice from Xendit (`getInvoice`) instead of trusting the body, then checks `paid_amount === charge`. `PAID` → mark the payment, update the order summary and notify cashiers and the customer. `EXPIRED` → if it was the first payment and the order is still `confirmed`, auto-cancel and restore stock. A balance expiring only resets the balance choice. Always returns 200 quickly. |
| `POST /api/webhooks/xendit/refund` | Xendit | Same token check. `refund.succeeded` → `REFUNDED`. `refund.failed` → `REFUND_FAILED` plus an owner notification to refund manually. |

`createInvoice` parameters: `external_id = "DC-<orderId>-<kind>-<timestamp>"`,
`amount` = `charge`, `currency: 'PHP'`, `invoice_duration` (seconds, from the expiry config),
`payment_methods` = **only the chosen channel**, `items` with an order line and a
"Transaction fee" line (so Xendit's page shows the same breakdown), `description`, `customer`
(name/email/phone when known), and
`success_redirect_url` / `failure_redirect_url` = `${FRONTEND_URL}/track?order=<id>&payment=success|failed`.
Do **not** put the guest's phone number in the URL. The track page already
knows guest orders through `orderHistoryStorage`.

### 3.5 Status gate — `order.controller.ts → updateStatus`
Replace the "MANUAL PAYMENT gate" block with one `assertPaymentAllowsStatus(order, status)` in `payment.service`:
- `preparing` / `ready`: requires `paymentStatus ∈ {paid, down_payment}` **or** `paymentChoice = cash_on_pickup`. Error code: `PAYMENT_REQUIRED`.
- `on_the_way`: delivery DP orders also need the balance paid online.
- `completed`: requires `paymentStatus = paid`. Cash cases reach this through **Cash received**.
- In-store and legacy orders (no `paymentStatus`) are unchanged.

On `status === 'cancelled'` (staff), after the existing stock restore, call
`paymentService.handleOrderCancelled(orderId)`: expire PENDING invoices, refund
PAID ones, and set `refundStatus = pending`.

### 3.6 Removals (everything tied to manual payment)
- `order.controller.ts`: `submitPayment`, `verifyPayment`,
  `ONLINE_PAYMENT_METHODS`, `PAYMENT_STATUS_LABELS`,
  `notifyCashiersOfPaymentSubmitted` (replace with `notifyCashiersOfPaymentReceived`).
- `order.routes.ts`: `POST /:id/payment` (multer upload), `PATCH /:id/payment/verify`, and the `paymentUpload` multer instance.
- `order.repository.ts`: `submitManualPayment`, plus the `paymentVerified`/proof fields in `updatePaymentState`.
- `cloudinary.service.ts`: `uploadPaymentProofBuffer` (`payments/proofs` folder).
- `SiteSetting.model.ts` plus the settings service, defaults and DTO: the whole `payment` block (`image`, `accountName`, `accountNumber`, `instructions`, `channels`, `activeChannelId`).
- `Transaction.model.ts`: keep `PaymentMethod` and add `'grabpay' | 'shopeepay'`. The webhook maps Xendit's `payment_channel` onto it so the reports' **payment method** breakdown keeps working. `bdo` / `bpi` / `psbank` stay for old records.

### 3.7 Route ordering note
Mount `/api/webhooks` **before** any auth middleware. While editing
`order.routes.ts`, also move `GET /follow-up` above `GET /:id` (it is currently
shadowed — a separate existing bug).

---

## 4. Frontend changes (`frontend/`)

| File | Change |
|---|---|
| `lib/api/orderApi.ts` | Remove `submitPayment`/`verifyPayment`. Add `startPaymentCheckout(id, kind)`, `chooseBalance(id, method)`. Update the order type: add `paymentChoice`, `balanceChoice`, `amountPaid`, `refundStatus`, `paymentChannel`, and remove the proof and verified fields. |
| `features/order/components/OrderTracking.tsx` | Replace the manual-payment panel (channel list, account details, screenshot upload) with: **Pay online (₱X)**, **Pay 50% down payment (₱Y)** for pre-orders only, and **Cash on pickup** for pickup only. For online payment the customer picks a channel (GCash / Maya / GrabPay / ShopeePay / Card) and sees the breakdown *Order ₱300 · Transaction fee ₱8 · Total ₱308*, with a short note that the fee is charged by the payment provider. Then they're redirected to Xendit. On `?payment=success`, show "Confirming your payment…" and poll the order until the webhook marks it paid. Show the expiry countdown. After a down payment, show the balance choice. |
| `features/cashier/orders/components/CashierOrders.tsx`, `CashierOrderDetail.tsx` | Remove the proof viewer and the Verify/Reject buttons. Add badges: *Awaiting payment (expires 3:45 PM)*, *Paid online · GCash*, *Down payment 50% · balance: cash/online/unpaid*, *Cash on pickup · collect ₱X*, *Refund pending/failed*. Disable **Mark as preparing** and **Complete** with a tooltip explaining why. The new "Payment received" notification refreshes the queue. |
| `features/owner/orders/components/OrderDetailDrawer.tsx`, `OwnerOrdersPage.tsx` | Same badges, plus refund status and the Xendit invoice id for reference. |
| `features/owner/settings/components/PaymentTab.tsx` | **Delete.** |
| `features/owner/settings/components/SettingsPage.tsx` | Remove the Payment tab entry. |
| `lib/hooks/useSettings.ts`, `lib/types/settings.ts` | Remove the `payment` settings type and its usage. |
| `features/cashier/counter/*` | **No change.** Walk-in (counter) orders stay on the register flow. |

---

## 5. Implementation order

1. **Foundation:** env vars, `xendit.service.ts`, `Payment` model and repository.
2. **Full payment and cash on pickup:** checkout endpoint, invoice webhook (PAID), new status gate, cashier and customer notifications.
3. **Down payment and balance:** the `down_payment` kind, the balance endpoint, and the on_the_way/completed gates.
4. **Expiry and refunds:** EXPIRED auto-cancel, refund on staff cancel, refund webhook, owner alert on failure.
5. **Remove the manual flow:** backend removals (3.6) and frontend Settings/Payment removal.
6. **Frontend UI:** tracking page, cashier views, owner views.
7. **Verification:** frontend `typecheck` and `lint`, backend `tsc`, then the manual test pass below.

## 6. Test plan (Xendit test mode)

Setup: create a Xendit account, then in **Test mode** copy the secret key
(`xnd_development_…`) and the webhook verification token. Set the Invoice
paid/expired and Refund webhook URLs to
`https://<backend>.vercel.app/api/webhooks/xendit/invoice` and
`…/api/webhooks/xendit/refund`. For local development, expose port 5000 with a
tunnel such as ngrok and point the webhooks there.

- [ ] Regular delivery order: confirm → pay online → webhook marks paid → cashier sees "Paid online" → preparing unlocks.
- [ ] Fee: ₱300 via GCash shows ₱8 fee / ₱308 total on our page and on Xendit's page. Reports still show ₱300 revenue.
- [ ] A tampered checkout request (edited fee or amount) is ignored, because the server recomputes the charge.
- [ ] Pickup + cash: preparing unlocks immediately, and **Complete** stays locked until **Cash received**.
- [ ] Pre-order DP + cash balance: 50% paid → preparing unlocks → cash received → complete.
- [ ] Pre-order DP + online balance (delivery): `on_the_way` stays locked until the second invoice is paid.
- [ ] Invoice expires (set expiry to 1–2 minutes in `.env` while testing) → order auto-cancelled, stock restored.
- [ ] Staff cancels a paid order → refund created → `refund.succeeded` → "Refunded".
- [ ] Webhook with a wrong token → 401, and nothing changes.
- [ ] Same PAID webhook sent twice → applied once, with no duplicate notifications.
- [ ] Owner settings no longer show a Payment tab. Counter (walk-in) orders still work.
