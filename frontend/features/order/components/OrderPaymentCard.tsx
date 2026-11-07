'use client';

import {useEffect, useState} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RotateCcw,
  Wallet
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  PAYMENT_CHANNEL_LABELS,
  type OrderHistoryEntry,
  type PaymentChannel,
  type PaymentSummary,
  type QuoteMap
} from '@/lib/api/orderApi';
import {
  usePayBalanceMutation,
  usePaymentSummaryQuery,
  useStartCheckoutMutation,
  useSubmitCashPaymentMutation
} from '@/lib/hooks/orders/useTrackOrder';

/*
 * XENDIT PAYMENT card (customer side).
 *
 * Appears once the cashier confirms the order. The customer picks full
 * payment, a 50% down payment (pre-order-only carts) or cash on pickup
 * (pickup only). Online options show the per-channel transaction fee, then
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
    !!order.refundStatus &&
    order.refundStatus !== 'none';
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
    <div className="rounded-2xl bg-white shadow p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-bold text-gray-900">Payment</p>
        {summary ? <StatusPill summary={summary} /> : null}
      </div>

      {query.isLoading || !summary ? (
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : query.isError ? (
        <p className="mt-4 text-sm text-red-600">
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
    return <span className={`${base} bg-sky-50 text-sky-700`}>Refunded</span>;
  }
  if (summary.refundStatus === 'pending') {
    return <span className={`${base} bg-sky-50 text-sky-700`}>Refund in progress</span>;
  }
  if (summary.paymentStatus === 'paid') {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700`}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Paid
      </span>
    );
  }
  if (summary.paymentStatus === 'down_payment') {
    return <span className={`${base} bg-amber-50 text-amber-700`}>Down payment paid</span>;
  }
  if (summary.paymentChoice === 'cash_on_pickup') {
    return <span className={`${base} bg-gray-100 text-gray-700`}>Cash on pickup</span>;
  }
  return <span className={`${base} bg-amber-50 text-amber-700`}>Awaiting payment</span>;
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
    return (
      <p className="mt-4 text-sm text-gray-600">
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
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[#3c5e45]" />
        <div className="text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Confirming your payment…</p>
          <p className="mt-0.5">
            This usually takes a few seconds. You can keep this page open.
          </p>
        </div>
      </div>
    );
  }

  const returnedFailed =
    returned === 'failed' ? (
      <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
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
        <div className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
          <Row label="Order total" value={peso(summary.totalAmount)} />
          <Row label="Down payment paid" value={peso(summary.amountPaid)} />
          <Row label="Balance due" value={peso(summary.balanceDue)} bold />
        </div>
        {summary.pendingPayment && !changing ? (
          <PendingInvoice summary={summary} onChange={() => setChanging(true)} />
        ) : summary.balanceChoice === 'cash' && !changing ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">
              Pay the {peso(summary.balanceDue)} balance in cash when you pick up your order.
            </p>
            <button
              type="button"
              onClick={() => setChanging(true)}
              className="mt-2 text-xs font-semibold text-[#3c5e45] hover:underline"
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
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">
          Pay {peso(summary.totalAmount)} in cash when you pick up your order.
        </p>
        {order.orderStatus === 'confirmed' ? (
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="mt-2 text-xs font-semibold text-[#3c5e45] hover:underline"
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
      <p className="mt-4 text-sm text-gray-600">
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
      <span className="text-gray-500">{label}</span>
      <span className={bold ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}>
        {value}
      </span>
    </div>
  );
}

function PaidDetails({summary}: {summary: PaymentSummary}) {
  const paidOnline = summary.payments.filter(p => p.status === 'PAID');
  return (
    <div className="mt-4 space-y-2 text-sm">
      <p className="text-gray-600">Your payment is complete. Thank you!</p>
      <div className="rounded-xl border border-gray-200 px-4 py-3">
        {paidOnline.map(p => (
          <Row
            key={p.id}
            label={`${p.kind === 'down_payment' ? 'Down payment' : p.kind === 'balance' ? 'Balance' : 'Paid'} via ${PAYMENT_CHANNEL_LABELS[p.channel]}`}
            value={peso(p.charge)}
          />
        ))}
        {summary.paymentChoice === 'cash_on_pickup' ||
        summary.balanceChoice === 'cash' ? (
          <Row
            label="Paid in cash"
            value={peso(
              summary.totalAmount - paidOnline.reduce((s, p) => s + p.amount, 0)
            )}
          />
        ) : null}
        {summary.transactionFee > 0 ? (
          <p className="mt-1 text-xs text-gray-500">
            Includes {peso(summary.transactionFee)} transaction fee charged by the payment provider.
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
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-900"
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
  const [plan, setPlan] = useState<Plan>('full');
  const [channel, setChannel] = useState<PaymentChannel>('gcash');
  const [error, setError] = useState<string | null>(null);
  const checkout = useStartCheckoutMutation(order._id, phone);
  const cash = useSubmitCashPaymentMutation(order._id, phone);

  const quotes: QuoteMap | null =
    plan === 'down_payment' ? summary.quotes.down_payment : summary.quotes.full;

  const submit = async () => {
    setError(null);
    try {
      if (plan === 'cash') {
        await cash.mutateAsync();
        onCancel?.();
      } else {
        await checkout.mutateAsync({kind: plan, channel});
      }
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Could not start the payment. Please try again.'));
    }
  };

  const busy = checkout.isPending || cash.isPending;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Your order is confirmed. Choose how you want to pay.
      </p>

      <div className="space-y-2">
        <PlanOption
          active={plan === 'full'}
          onClick={() => setPlan('full')}
          title="Pay in full online"
          subtitle={peso(summary.totalAmount)}
          disabled={!summary.configured}
        />
        {summary.downPaymentAllowed ? (
          <PlanOption
            active={plan === 'down_payment'}
            onClick={() => setPlan('down_payment')}
            title="Pay 50% down payment online"
            subtitle={`${peso(summary.downPaymentAmount)} now, ${peso(summary.totalAmount - summary.downPaymentAmount)} later`}
            disabled={!summary.configured}
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

      {!summary.configured ? (
        <p className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Online payment is not available yet.
          {summary.cashAllowed ? ' You can pay in cash on pickup.' : ' Please contact the store.'}
        </p>
      ) : null}

      {plan !== 'cash' && quotes && summary.configured ? (
        <ChannelPicker
          quotes={quotes}
          channels={summary.channels}
          channel={channel}
          onChange={setChannel}
        />
      ) : null}

      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={submit}
          disabled={busy || (plan !== 'cash' && !summary.configured)}
          className="bg-[#3c5e45]"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
          {plan === 'cash'
            ? 'Confirm cash on pickup'
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
  const [channel, setChannel] = useState<PaymentChannel>('gcash');
  const [error, setError] = useState<string | null>(null);
  const balance = usePayBalanceMutation(order._id, phone);
  const quotes = summary.quotes.balance;

  const submit = async () => {
    setError(null);
    try {
      await balance.mutateAsync(
        method === 'cash' ? {method: 'cash'} : {method: 'online', channel}
      );
      if (method === 'cash') onCancel?.();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Could not update the balance payment. Please try again.'));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">How do you want to pay the balance?</p>
      <div className="space-y-2">
        <PlanOption
          active={method === 'online'}
          onClick={() => setMethod('online')}
          title="Pay the balance online"
          subtitle={peso(summary.balanceDue)}
          disabled={!summary.configured}
        />
        {summary.cashAllowed ? (
          <PlanOption
            active={method === 'cash'}
            onClick={() => setMethod('cash')}
            title="Cash on pickup"
            subtitle={`Pay ${peso(summary.balanceDue)} at the store`}
          />
        ) : null}
      </div>

      {method === 'online' && quotes && summary.configured ? (
        <ChannelPicker
          quotes={quotes}
          channels={summary.channels}
          channel={channel}
          onChange={setChannel}
        />
      ) : null}

      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={submit}
          disabled={balance.isPending || (method === 'online' && !summary.configured)}
          className="bg-[#3c5e45]"
        >
          {balance.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
          {method === 'cash'
            ? 'Confirm cash on pickup'
            : `Pay ${peso(quotes?.[channel]?.charge ?? 0)}`}
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
        active ? 'border-[#3c5e45]/40 bg-[#3c5e45]/5' : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          active ? 'border-[#3c5e45] bg-[#3c5e45]' : 'border-gray-300'
        }`}
      >
        {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{subtitle}</span>
      </span>
    </button>
  );
}

function ChannelPicker({
  quotes,
  channels,
  channel,
  onChange
}: {
  quotes: QuoteMap;
  channels: PaymentSummary['channels'];
  channel: PaymentChannel;
  onChange: (c: PaymentChannel) => void;
}) {
  const q = quotes[channel];
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        Pay with
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {channels.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
              channel === c.id
                ? 'border-[#3c5e45] bg-[#3c5e45]/5 font-bold text-gray-900'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {q ? (
        <div className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
          <Row label="Order amount" value={peso(q.amount)} />
          <Row label="Transaction fee" value={peso(q.transactionFee)} />
          <div className="my-1 border-t border-gray-100" />
          <Row label="Total to pay" value={peso(q.charge)} bold />
          <p className="mt-2 text-xs text-gray-500">
            The transaction fee is charged by our payment provider (Xendit) for{' '}
            {PAYMENT_CHANNEL_LABELS[channel]}. You will be redirected to a secure
            Xendit page to pay.
          </p>
        </div>
      ) : null}
    </div>
  );
}
