'use client';

import {useEffect, useState} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RotateCcw,
  Store,
  Wallet
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  PAYMENT_CHANNEL_LABELS,
  isInStoreChoice,
  type OrderHistoryEntry,
  type PaymentChannel,
  type PaymentSummary,
  type QuoteMap
} from '@/lib/api/orderApi';
import {
  useChooseInStoreMutation,
  usePayBalanceMutation,
  usePaymentSummaryQuery,
  useStartCheckoutMutation,
  useSubmitCashPaymentMutation
} from '@/lib/hooks/orders/useTrackOrder';
import {formatManilaDateTime, inStoreRuleText} from '@/lib/payment/inStorePayment';
import PaymentChannelTiles, {type PayOption} from './PaymentChannelTiles';

/*
 * XENDIT PAYMENT card (customer side).
 *
 * Appears once the cashier confirms the order. The customer picks full
 * payment, a down payment (owner-set %, pre-order-only carts) or cash on pickup
 * (pickup only), then pays online or In-store (cash at the counter before a
 * deadline, no service fee; see lib/payment/inStorePayment). Online options
 * show the per-channel service fee, then
 * redirect to Xendit's hosted checkout. Xendit's webhook marks the order paid;
 * this card polls until that happens.
 */

const PAYMENT_OPEN = ['confirmed', 'preparing', 'ready', 'on_the_way'];

function peso(value: number) {
  return `₱${(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/** Reads ?payment=success|failed once (no useSearchParams: /track is static). */
function useReturnFromXendit() {
  const [state, setState] = useState<'success' | 'failed' | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('payment');
    if (value === 'success' || value === 'failed') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(value);
    }
  }, []);
  const clear = () => {
    setState(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    window.history.replaceState(null, '', url.toString());
  };
  return [state, clear] as const;
}

export default function OrderPaymentCard({
  order,
  phone
}: {
  order: OrderHistoryEntry;
  phone?: string;
}) {
  const isOnline = order.orderSource !== 'in-store';
  const refundVisible =
    order.orderStatus === 'cancelled' &&
    ((!!order.refundStatus && order.refundStatus !== 'none') ||
      (order.refund?.paid ?? 0) > 0);
  const visible =
    isOnline && (PAYMENT_OPEN.includes(order.orderStatus) || refundVisible);

  const [returned, clearReturned] = useReturnFromXendit();
  const query = usePaymentSummaryQuery(order._id, phone, {
    enabled: visible,
    awaitingConfirmation: returned === 'success'
  });
  const summary = query.data;

  // Stop the "confirming" state once the webhook has landed.
  useEffect(() => {
    if (returned === 'success' && summary && !summary.pendingPayment) {
      clearReturned();
    }
  }, [returned, summary, clearReturned]);

  if (!visible) return null;

  return (
    <div className="rounded-2xl bg-white shadow p-6 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-bold text-gray-900 dark:text-gray-100">Payment</p>
        {summary ? <StatusPill summary={summary} /> : null}
      </div>

      {query.isLoading || !summary ? (
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : query.isError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-300">
          We could not load the payment details. Please refresh the page.
        </p>
      ) : (
        <PaymentBody
          order={order}
          summary={summary}
          phone={phone}
          returned={returned}
          onDismissReturn={clearReturned}
        />
      )}
    </div>
  );
}

function StatusPill({summary}: {summary: PaymentSummary}) {
  const base =
    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold';
  if (summary.refundStatus === 'refunded') {
    return <span className={`${base} bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300`}>Refunded</span>;
  }
  if (summary.refundStatus === 'pending') {
    return <span className={`${base} bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300`}>Refund in progress</span>;
  }
  if (summary.paymentStatus === 'paid') {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300`}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Paid
      </span>
    );
  }
  if (summary.paymentStatus === 'down_payment') {
    return <span className={`${base} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300`}>Down payment paid</span>;
  }
  if (summary.paymentChoice === 'cash_on_pickup') {
    return <span className={`${base} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`}>Cash on pickup</span>;
  }
  if (isInStoreChoice(summary.paymentChoice)) {
    return (
      <span className={`${base} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300`}>
        <Store className="h-3.5 w-3.5" />
        Pay in store
      </span>
    );
  }
  return <span className={`${base} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300`}>Awaiting payment</span>;
}

function PaymentBody({
  order,
  summary,
  phone,
  returned,
  onDismissReturn
}: {
  order: OrderHistoryEntry;
  summary: PaymentSummary;
  phone?: string;
  returned: 'success' | 'failed' | null;
  onDismissReturn: () => void;
}) {
  const [changing, setChanging] = useState(false);

  // Refund state (cancelled orders).
  if (order.orderStatus === 'cancelled') {
    const r = summary.refund;
    if (r) {
      const cashDue = summary.cashRefundDue ?? 0;
      return (
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
            <Row label="You paid (order amount)" value={peso(r.paid)} />
            {r.retained > 0 ? <Row label="Kept under the refund policy" value={peso(r.retained)} /> : null}
            {r.onlineTotal > 0 ? <Row label="Back to your e-wallet / card" value={peso(r.onlineTotal)} /> : null}
            {cashDue > 0 ? <Row label="Cash to collect at the store" value={peso(cashDue)} /> : null}
            {r.feesNotRefunded > 0 ? <Row label="Service fees (not refundable)" value={peso(r.feesNotRefunded)} /> : null}
            <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
            <Row label="Total refund" value={peso(r.refundTotal)} bold />
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            {r.onlineTotal > 0
              ? summary.refundStatus === 'failed'
                ? 'We are processing your online refund manually. Our team will contact you. '
                : summary.payments.some(p => p.status === 'REFUND_PENDING')
                  ? 'Your online refund is being processed and may take 5-7 business days to reflect. '
                  : 'Your online refund was sent to your original payment method. '
              : ''}
            {cashDue > 0
              ? summary.cashRefundedAt
                ? 'Your cash refund was handed to you at the store.'
                : 'Bring your order number to the store counter to collect your cash refund.'
              : ''}
            {r.refundTotal <= 0 ? 'Under our refund policy, no amount is refunded for this cancellation.' : ''}
          </p>
        </div>
      );
    }
    return (
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
        {summary.refundStatus === 'refunded'
          ? 'Your payment was refunded to your original payment method. It may take a few days to reflect.'
          : summary.refundStatus === 'failed'
            ? 'We are processing your refund manually. Our team will contact you.'
            : 'Your refund is being processed. You will be notified once it is done.'}
      </p>
    );
  }

  if (summary.paymentStatus === 'paid') {
    return <PaidDetails summary={summary} />;
  }

  // Waiting for Xendit's webhook after the redirect back.
  if (returned === 'success' && summary.pendingPayment) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[#3c5e45] dark:text-[#7ed4a0]" />
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <p className="font-semibold text-gray-900 dark:text-gray-100">Confirming your payment…</p>
          <p className="mt-0.5">
            This usually takes a few seconds. You can keep this page open.
          </p>
        </div>
      </div>
    );
  }

  const returnedFailed =
    returned === 'failed' ? (
      <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        <span>The payment was not completed. You can try again below.</span>
        <button
          type="button"
          onClick={onDismissReturn}
          className="text-xs font-semibold underline"
        >
          Dismiss
        </button>
      </div>
    ) : null;

  // Down payment paid: settle the balance.
  if (summary.paymentStatus === 'down_payment') {
    return (
      <div className="mt-4 space-y-4">
        {returnedFailed}
        <div className="rounded-xl border border-gray-200 px-4 py-3 text-sm dark:border-gray-700">
          <Row label="Order total" value={peso(summary.totalAmount)} />
          <Row label="Down payment paid" value={peso(summary.amountPaid)} />
          <Row label="Balance due" value={peso(summary.balanceDue)} bold />
        </div>
        {summary.pendingPayment && !changing ? (
          <PendingInvoice summary={summary} onChange={() => setChanging(true)} />
        ) : summary.balanceChoice === 'in_store' && !changing ? (
          <div className="space-y-2">
            <BalanceInStoreNotice orderId={order._id} summary={summary} />
            {summary.configured ? (
              <button
                type="button"
                onClick={() => setChanging(true)}
                className="text-xs font-semibold text-[#3c5e45] hover:underline dark:text-[#7ed4a0]"
              >
                Pay the balance online instead
              </button>
            ) : null}
          </div>
        ) : summary.balanceChoice === 'cash' && !changing ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <p className="font-semibold">
              Pay the {peso(summary.balanceDue)} balance in cash when you pick up your order.
            </p>
            <button
              type="button"
              onClick={() => setChanging(true)}
              className="mt-2 text-xs font-semibold text-[#3c5e45] hover:underline dark:text-[#7ed4a0]"
            >
              Pay the balance online instead
            </button>
          </div>
        ) : (
          <BalanceForm
            order={order}
            summary={summary}
            phone={phone}
            onCancel={changing ? () => setChanging(false) : undefined}
          />
        )}
      </div>
    );
  }

  // Unpaid.
  if (summary.paymentChoice === 'cash_on_pickup' && !changing) {
    return (
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          Pay {peso(summary.totalAmount)} in cash when you pick up your order.
        </p>
        {order.orderStatus === 'confirmed' ? (
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="mt-2 text-xs font-semibold text-[#3c5e45] hover:underline dark:text-[#7ed4a0]"
          >
            Pay online instead
          </button>
        ) : null}
      </div>
    );
  }

  if (isInStoreChoice(summary.paymentChoice) && summary.inStore && !changing) {
    const down = summary.paymentChoice === 'in_store_down_payment';
    return (
      <div className="mt-4 space-y-3">
        <InStoreNotice
          orderId={order._id}
          summary={summary}
          amount={down ? summary.downPaymentAmount : summary.totalAmount}
          down={down}
        />
        {order.orderStatus === 'confirmed' && summary.configured ? (
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="text-xs font-semibold text-[#3c5e45] hover:underline dark:text-[#7ed4a0]"
          >
            Pay online instead
          </button>
        ) : null}
      </div>
    );
  }

  if (summary.pendingPayment && !changing) {
    return (
      <div className="mt-4 space-y-3">
        {returnedFailed}
        <PendingInvoice summary={summary} onChange={() => setChanging(true)} />
      </div>
    );
  }

  if (order.orderStatus !== 'confirmed') {
    // Orders that moved on before this payment flow existed.
    return (
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
        Payment for this order is arranged with the store.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {returnedFailed}
      <PayForm
        order={order}
        summary={summary}
        phone={phone}
        onCancel={changing ? () => setChanging(false) : undefined}
      />
    </div>
  );
}

function Row({label, value, bold}: {label: string; value: string; bold?: boolean}) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={bold ? 'font-bold text-gray-900 dark:text-gray-100' : 'font-semibold text-gray-800 dark:text-gray-100'}>
        {value}
      </span>
    </div>
  );
}

function PaidDetails({summary}: {summary: PaymentSummary}) {
  const paidOnline = summary.payments.filter(p => p.status === 'PAID');
  return (
    <div className="mt-4 space-y-2 text-sm">
      <p className="text-gray-600 dark:text-gray-300">Your payment is complete. Thank you!</p>
      <div className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
        {paidOnline.map(p => (
          <Row
            key={p.id}
            label={`${p.kind === 'down_payment' ? 'Down payment' : p.kind === 'balance' ? 'Balance' : 'Paid'} via ${PAYMENT_CHANNEL_LABELS[p.channel]}`}
            value={peso(p.charge)}
          />
        ))}
        {summary.paymentChoice === 'cash_on_pickup' ||
        isInStoreChoice(summary.paymentChoice) ||
        summary.balanceChoice === 'cash' ||
        summary.balanceChoice === 'in_store' ? (
          <Row
            label="Paid in cash"
            value={peso(
              summary.totalAmount - paidOnline.reduce((s, p) => s + p.amount, 0)
            )}
          />
        ) : null}
        {summary.transactionFee > 0 ? (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Includes {peso(summary.transactionFee)} service fee charged by the payment provider.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PendingInvoice({
  summary,
  onChange
}: {
  summary: PaymentSummary;
  onChange: () => void;
}) {
  const p = summary.pendingPayment!;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
      <p className="flex items-center gap-1.5 font-semibold">
        <Clock className="h-4 w-4" />
        Waiting for your {PAYMENT_CHANNEL_LABELS[p.channel]} payment of {peso(p.charge)}
      </p>
      <p className="mt-1 text-xs">
        Pay before {timeOf(p.expiresAt)}
        {p.kind !== 'balance'
          ? ' or the order will be cancelled automatically.'
          : '.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={p.invoiceUrl}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#3c5e45] px-4 py-2 text-xs font-semibold text-white"
        >
          Continue to payment
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          onClick={onChange}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:text-amber-300"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Choose another method
        </button>
      </div>
    </div>
  );
}

type Plan = 'full' | 'down_payment' | 'cash';

function PayForm({
  order,
  summary,
  phone,
  onCancel
}: {
  order: OrderHistoryEntry;
  summary: PaymentSummary;
  phone?: string;
  onCancel?: () => void;
}) {
  const inStore = summary.inStore ?? null;
  const inStoreOpen = inStore?.allowed === true;
  const [plan, setPlan] = useState<Plan>('full');
  const [channel, setChannel] = useState<PayOption>(
    !summary.configured && inStoreOpen ? 'in_store' : 'gcash'
  );
  const [error, setError] = useState<string | null>(null);
  const checkout = useStartCheckoutMutation(order._id, phone);
  const cash = useSubmitCashPaymentMutation(order._id, phone);
  const inStoreMutation = useChooseInStoreMutation(order._id, phone);

  const quotes: QuoteMap | null =
    plan === 'down_payment' ? summary.quotes.down_payment : summary.quotes.full;
  const payInStore = plan !== 'cash' && channel === 'in_store';

  const submit = async () => {
    setError(null);
    try {
      if (plan === 'cash') {
        await cash.mutateAsync();
        onCancel?.();
      } else if (channel === 'in_store') {
        await inStoreMutation.mutateAsync(plan);
        onCancel?.();
      } else {
        await checkout.mutateAsync({kind: plan, channel});
      }
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Could not start the payment. Please try again.'));
    }
  };

  const busy = checkout.isPending || cash.isPending || inStoreMutation.isPending;
  // Only show the plan picker when there's an actual alternative to paying in full.
  const hasPlanChoice = summary.downPaymentAllowed || summary.cashAllowed;
  // Full / down payment can be paid online or in store.
  const canPayPlan = summary.configured || inStoreOpen;
  const where = inStore ? '' : ' online';

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Your order is confirmed.{' '}
        {hasPlanChoice || inStore
          ? 'Choose how you want to pay.'
          : `Pay ${peso(summary.totalAmount)} online to continue.`}
      </p>

      {hasPlanChoice ? (
      <div className="space-y-2">
        <PlanOption
          active={plan === 'full'}
          onClick={() => setPlan('full')}
          title={`Pay in full${where}`}
          subtitle={peso(summary.totalAmount)}
          disabled={!canPayPlan}
        />
        {summary.downPaymentAllowed ? (
          <PlanOption
            active={plan === 'down_payment'}
            onClick={() => setPlan('down_payment')}
            title={`Pay ${summary.downPaymentPercent ?? 50}% down payment${where}`}
            subtitle={`${peso(summary.downPaymentAmount)} now, ${peso(summary.totalAmount - summary.downPaymentAmount)} later`}
            disabled={!canPayPlan}
          />
        ) : null}
        {summary.cashAllowed ? (
          <PlanOption
            active={plan === 'cash'}
            onClick={() => setPlan('cash')}
            title="Cash on pickup"
            subtitle={`Pay ${peso(summary.totalAmount)} at the store`}
          />
        ) : null}
      </div>
      ) : null}

      {!summary.configured ? (
        <p className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Online payment is not available yet.
          {inStoreOpen
            ? ' You can pay in cash at the store.'
            : summary.cashAllowed
              ? ' You can pay in cash on pickup.'
              : ' Please contact the store.'}
        </p>
      ) : null}

      {plan !== 'cash' && canPayPlan ? (
        <ChannelPicker
          quotes={summary.configured ? quotes : null}
          channels={summary.channels}
          channel={channel}
          onChange={setChannel}
          showOnline={summary.configured}
          inStore={
            inStore
              ? {available: inStore.allowed, note: inStore.allowed ? null : inStore.reason}
              : undefined
          }
        />
      ) : null}

      {payInStore && inStore ? (
        <InStoreNotice
          orderId={order._id}
          summary={summary}
          amount={plan === 'down_payment' ? summary.downPaymentAmount : summary.totalAmount}
          down={plan === 'down_payment'}
          preview
        />
      ) : null}

      {error ? <p className="text-xs font-medium text-red-600 dark:text-red-300">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={submit}
          disabled={
            busy ||
            (plan !== 'cash' &&
              (payInStore ? !inStoreOpen : !summary.configured || channel === 'in_store'))
          }
          className="bg-[#3c5e45]"
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : payInStore ? (
            <Store className="mr-2 h-4 w-4" />
          ) : (
            <Wallet className="mr-2 h-4 w-4" />
          )}
          {plan === 'cash'
            ? 'Confirm cash on pickup'
            : payInStore
              ? 'Confirm in-store payment'
              : channel === 'in_store'
                ? 'Choose a payment method'
                : `Pay ${peso(quotes?.[channel]?.charge ?? 0)}`}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function BalanceForm({
  order,
  summary,
  phone,
  onCancel
}: {
  order: OrderHistoryEntry;
  summary: PaymentSummary;
  phone?: string;
  onCancel?: () => void;
}) {
  const [method, setMethod] = useState<'online' | 'cash'>('online');
  const inStoreOffered = !!summary.balanceInStore;
  const [channel, setChannel] = useState<PayOption>(
    !summary.configured && inStoreOffered ? 'in_store' : 'gcash'
  );
  const [error, setError] = useState<string | null>(null);
  const balance = usePayBalanceMutation(order._id, phone);
  const quotes = summary.quotes.balance;
  const payInStore = method === 'online' && channel === 'in_store';
  const canPay = summary.configured || inStoreOffered;

  const submit = async () => {
    setError(null);
    try {
      await balance.mutateAsync(
        method === 'cash'
          ? {method: 'cash'}
          : channel === 'in_store'
            ? {method: 'in_store'}
            : {method: 'online', channel}
      );
      if (method === 'cash' || channel === 'in_store') onCancel?.();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Could not update the balance payment. Please try again.'));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">How do you want to pay the balance?</p>
      <div className="space-y-2">
        <PlanOption
          active={method === 'online'}
          onClick={() => setMethod('online')}
          title={inStoreOffered ? 'Pay the balance now' : 'Pay the balance online'}
          subtitle={
            inStoreOffered
              ? `${peso(summary.balanceDue)} online or in store`
              : peso(summary.balanceDue)
          }
          disabled={!canPay}
        />
        {(summary.balanceCashAllowed ?? summary.cashAllowed) ? (
          <PlanOption
            active={method === 'cash'}
            onClick={() => setMethod('cash')}
            title="Cash on pickup"
            subtitle={`Pay ${peso(summary.balanceDue)} at the store`}
          />
        ) : null}
      </div>

      {method === 'online' && canPay ? (
        <ChannelPicker
          quotes={summary.configured ? quotes : null}
          channels={summary.channels}
          channel={channel}
          onChange={setChannel}
          showOnline={summary.configured}
          inStore={inStoreOffered ? {available: true} : undefined}
        />
      ) : null}

      {payInStore ? (
        <BalanceInStoreNotice orderId={order._id} summary={summary} preview />
      ) : null}

      {error ? <p className="text-xs font-medium text-red-600 dark:text-red-300">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={submit}
          disabled={
            balance.isPending ||
            (method === 'online' && !payInStore && !summary.configured)
          }
          className="bg-[#3c5e45]"
        >
          {balance.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : payInStore ? (
            <Store className="mr-2 h-4 w-4" />
          ) : (
            <Wallet className="mr-2 h-4 w-4" />
          )}
          {method === 'cash'
            ? 'Confirm cash on pickup'
            : payInStore
              ? 'Confirm in-store payment'
              : `Pay ${peso(quotes?.[channel as PaymentChannel]?.charge ?? 0)}`}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={balance.isPending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function PlanOption({
  active,
  onClick,
  title,
  subtitle,
  disabled
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? 'border-[#3c5e45]/40 bg-[#3c5e45]/5 dark:border-[#7ed4a0]/30 dark:bg-[#7ed4a0]/10' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          active ? 'border-[#3c5e45] bg-[#3c5e45]' : 'border-gray-300 dark:border-gray-700'
        }`}
      >
        {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">{title}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>
      </span>
    </button>
  );
}

function ChannelPicker({
  quotes,
  channels,
  channel,
  onChange,
  showOnline,
  inStore
}: {
  quotes: QuoteMap | null;
  channels: PaymentSummary['channels'];
  channel: PayOption;
  onChange: (c: PayOption) => void;
  showOnline?: boolean;
  inStore?: {available: boolean; note?: string | null};
}) {
  const q = channel === 'in_store' ? null : quotes?.[channel];
  return (
    <div className="space-y-3">
      <PaymentChannelTiles
        quotes={quotes}
        channels={channels}
        channel={channel}
        onChange={onChange}
        showOnline={showOnline}
        inStore={inStore}
      />
      {q ? (
        <div className="rounded-xl border border-gray-200 px-4 py-3 text-sm dark:border-gray-700">
          <Row label="Order amount" value={peso(q.amount)} />
          <Row label="Service fee" value={peso(q.transactionFee)} />
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
          <Row label="Total to pay" value={peso(q.charge)} bold />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            The service fee is charged by our payment provider (Xendit) for{' '}
            {PAYMENT_CHANNEL_LABELS[channel as PaymentChannel]}.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * In-store payment disclaimer: amount, exact deadline (Manila time) and what
 * happens when it is missed. `preview` = shown before the customer confirms.
 */
function InStoreNotice({
  orderId,
  summary,
  amount,
  down,
  preview
}: {
  orderId: string;
  summary: PaymentSummary;
  amount: number;
  down: boolean;
  preview?: boolean;
}) {
  const info = summary.inStore;
  if (!info) return null;
  const isPreOrder = info.isPreOrderCart || summary.isPreOrder === true;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
      <p className="flex items-start gap-1.5 font-semibold">
        <Store className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {preview ? 'Pay' : 'Please pay'} {peso(amount)}
          {down ? ` (${summary.downPaymentPercent ?? 50}% down payment)` : ''} in cash at the store counter by{' '}
          <span className="whitespace-nowrap">{formatManilaDateTime(info.dueAt)}</span>{' '}
          (Philippine time).
        </span>
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
        <li>No service fee. Give order #{orderId.slice(-6).toUpperCase()} at the counter.</li>
        <li>{inStoreRuleText({isPreOrderCart: info.isPreOrderCart, hasPickupDate: info.hasPickupDate})}</li>
        <li>
          If we have not received it by then, your order is cancelled automatically
          {isPreOrder ? ' and your pickup slot is released.' : '.'}
        </li>
        <li>We start preparing your order once you have paid.</li>
        {down ? (
          <li>
            The remaining {peso(summary.totalAmount - amount)} balance is paid later, online or in cash on pickup.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** In-store balance disclaimer (after a down payment). No auto-cancel. */
function BalanceInStoreNotice({
  orderId,
  summary,
  preview
}: {
  orderId: string;
  summary: PaymentSummary;
  preview?: boolean;
}) {
  const dueAt = summary.balanceInStore?.dueAt ?? null;
  const delivery = summary.pickup?.receiveMethod === 'lalamove';
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
      <p className="flex items-start gap-1.5 font-semibold">
        <Store className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {preview ? 'Pay' : 'Please pay'} the {peso(summary.balanceDue)} balance in cash at the store counter
          {dueAt ? (
            <>
              {' '}by{' '}
              <span className="whitespace-nowrap">{formatManilaDateTime(dueAt)}</span>{' '}
              (Philippine time).
            </>
          ) : (
            ' before your order is released.'
          )}
        </span>
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
        <li>No service fee. Give order #{orderId.slice(-6).toUpperCase()} at the counter.</li>
        <li>
          Your order is not {delivery ? 'handed to the courier' : 'released'} until the balance is
          paid. Your down payment stays on the order.
        </li>
      </ul>
    </div>
  );
}
