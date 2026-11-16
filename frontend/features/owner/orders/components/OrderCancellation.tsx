'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {Loader2, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import type {OrderHistoryEntry, RefundPlan} from '@/lib/api/orderApi';
import {REFUND_POLICY_LABELS} from '@/lib/payment/refundPolicy';
import {
  useCancelQuoteQuery,
  useDeclineCancelRequestMutation,
  useMarkCashRefundedMutation,
  useStaffCancelOrderMutation
} from '@/lib/hooks/orders/useOrderCancellation';

/*
 * STAFF side of the cancellation & refund policy (lib/payment/refundPolicy).
 * The refund is never typed by hand: the backend computes it from who is
 * cancelling and when, and these components only preview and confirm it.
 */

function peso(value: number) {
  return `₱${(value ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function manila(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function Line({label, value, bold}: {label: string; value: string; bold?: boolean}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={bold ? 'font-bold text-gray-900 dark:text-gray-100' : 'font-semibold text-gray-800 dark:text-gray-100'}>
        {value}
      </span>
    </div>
  );
}

/** Refund breakdown of a plan (preview) or of the decided refund. */
export function RefundBreakdown({plan}: {plan: Omit<RefundPlan, 'online'>}) {
  if (plan.paid <= 0 && plan.refundTotal <= 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">Nothing was paid yet, so there is nothing to refund.</p>;
  }
  return (
    <div className="text-[0.8rem]">
      <p className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-200">{REFUND_POLICY_LABELS[plan.policy]}</p>
      <Line label="Paid (order amount)" value={peso(plan.paid)} />
      {plan.retained > 0 ? <Line label="Kept by the store" value={peso(plan.retained)} /> : null}
      {plan.onlineTotal > 0 ? <Line label="Back to e-wallet / card" value={peso(plan.onlineTotal)} /> : null}
      {plan.cash > 0 ? <Line label="Cash to return at the counter" value={peso(plan.cash)} /> : null}
      {plan.feesRefunded > 0 ? <Line label="Includes service fees" value={peso(plan.feesRefunded)} /> : null}
      {plan.feesNotRefunded > 0 ? <Line label="Service fees not refunded" value={peso(plan.feesNotRefunded)} /> : null}
      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
      <Line label="Customer gets back" value={peso(plan.refundTotal)} bold />
    </div>
  );
}

/**
 * Cancel dialog for online orders. "Customer asked" applies the customer
 * policy (full before the cut-off, 50% kept after); "Store" refunds all.
 */
export function StaffCancelDialog({
  order,
  onClose
}: {
  order: OrderHistoryEntry;
  onClose: () => void;
}) {
  const hasRequest = order.cancelRequest?.status === 'pending';
  const [by, setBy] = useState<'store' | 'customer'>(hasRequest ? 'customer' : 'store');
  const [reason, setReason] = useState(hasRequest ? order.cancelRequest?.reason ?? '' : '');
  const quote = useCancelQuoteQuery(order._id, {by});
  const cancel = useStaffCancelOrderMutation();

  const submit = async () => {
    try {
      await cancel.mutateAsync({
        orderId: order._id,
        cancelledBy: by,
        reason: reason.trim() || (by === 'store' ? 'Cancelled by the store' : "Cancelled at the customer's request")
      });
      toast.success('Order cancelled. The refund follows the policy.');
      onClose();
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Could not cancel the order.'));
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="ux-scrim absolute inset-0 bg-black/40" onClick={() => !cancel.isPending && onClose()} />
      <div className="ux-modal ux-modal-sheet relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">Cancel order #{order._id.slice(-6).toUpperCase()}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">The refund is calculated from the refund policy.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="ux-hit rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {([
            ['store', 'The store is cancelling', 'Cannot fulfil, date closed, etc. Full refund incl. service fees.'],
            ['customer', 'The customer asked to cancel', 'Customer policy: full amount before the cut-off, 50% kept after it.']
          ] as const).map(([value, title, hint]) => (
            <label
              key={value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-3 py-2.5 has-[:checked]:border-[#2d4a35] has-[:checked]:bg-[#2d4a35]/5 dark:border-gray-700 dark:has-[:checked]:border-[#7ed4a0]/60"
            >
              <input type="radio" name="cancel-by" className="mt-1 accent-[#2d4a35]" checked={by === value} onChange={() => setBy(value)} />
              <span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>
              </span>
            </label>
          ))}
        </div>

        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason shown to the customer (optional)"
          className="mt-3 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#2d4a35] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />

        <div className="mt-3 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-700">
          {quote.isLoading ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin text-gray-400" />
          ) : quote.data ? (
            <RefundBreakdown plan={quote.data.plan} />
          ) : (
            <p className="text-xs text-red-600">Could not load the refund preview.</p>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="destructive" className="flex-1 text-white" disabled={cancel.isPending || !quote.data} onClick={submit}>
            {cancel.isPending ? 'Cancelling...' : 'Cancel & refund'}
          </Button>
          <Button type="button" variant="outline" className="flex-1" disabled={cancel.isPending} onClick={onClose}>
            Keep order
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A late cancellation request waiting for the owner. */
export function CancelRequestPanel({
  order,
  canDecide = true
}: {
  order: OrderHistoryEntry;
  canDecide?: boolean;
}) {
  const request = order.cancelRequest;
  const [approving, setApproving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState('');
  const decline = useDeclineCancelRequestMutation();
  const quote = useCancelQuoteQuery(order._id, {by: 'customer', enabled: request?.status === 'pending'});

  if (!request || order.orderStatus === 'cancelled') return null;
  if (request.status === 'declined') {
    return (
      <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
        Cancellation request declined {manila(request.decidedAt)}.{request.note ? ` Note: ${request.note}` : ''}
      </p>
    );
  }
  if (request.status !== 'pending') return null;

  const submitDecline = async () => {
    try {
      await decline.mutateAsync({orderId: order._id, note: note.trim() || undefined});
      toast.success('Request declined. The customer was notified.');
      setDeclining(false);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Could not decline the request.'));
    }
  };

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.08em]">Cancellation requested</p>
      <p className="mt-1 text-[0.8rem]">
        Asked {manila(request.requestedAt)}, after the cut-off.
        {request.reason ? ` Reason: ${request.reason}` : ''}
      </p>
      <div className="mt-2 rounded-lg bg-white/70 px-3 py-2 dark:bg-gray-900/40">
        {quote.data ? <RefundBreakdown plan={quote.data.plan} /> : <Loader2 className="mx-auto h-4 w-4 animate-spin" />}
      </div>
      {canDecide ? (
        declining ? (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note to the customer (optional)"
              className="h-9 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm text-gray-900 outline-none dark:border-amber-500/30 dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={decline.isPending} onClick={submitDecline}>
                {decline.isPending ? 'Saving...' : 'Decline request'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setDeclining(false)}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="destructive" className="text-white" onClick={() => setApproving(true)}>
              Approve & cancel
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setDeclining(true)}>
              Decline
            </Button>
          </div>
        )
      ) : null}
      {approving ? <StaffCancelDialog order={order} onClose={() => setApproving(false)} /> : null}
    </section>
  );
}

/** Refund of a cancelled order, with the cash hand-back button. */
export function RefundSummary({
  order,
  canRefund = true
}: {
  order: OrderHistoryEntry;
  canRefund?: boolean;
}) {
  const markCash = useMarkCashRefundedMutation();
  const refund = order.refund;
  if (order.orderStatus !== 'cancelled' || !refund) return null;
  const cashDue = order.cashRefundDue ?? 0;

  const handleCash = async () => {
    try {
      await markCash.mutateAsync(order._id);
      toast.success('Cash refund recorded.');
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Could not record the cash refund.'));
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5 dark:border-sky-500/30 dark:bg-sky-500/10">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">Refund</p>
      <RefundBreakdown plan={refund} />
      {cashDue > 0 ? (
        order.cashRefundedAt ? (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
            Cash refund of {peso(cashDue)} given {manila(order.cashRefundedAt)}.
          </p>
        ) : canRefund ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" disabled={markCash.isPending} onClick={handleCash}>
              {markCash.isPending ? 'Saving...' : `Cash refunded (${peso(cashDue)})`}
            </Button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Click once the customer has received the cash.</span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{peso(cashDue)} cash refund waiting for the owner.</p>
        )
      ) : null}
    </div>
  );
}
