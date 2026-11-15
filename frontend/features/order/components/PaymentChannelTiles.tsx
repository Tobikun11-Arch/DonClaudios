'use client';

import {Check, CreditCard, ShieldCheck, Store} from 'lucide-react';
import {
  PAYMENT_CHANNEL_LABELS,
  type PaymentChannel,
  type PaymentSummary,
  type QuoteMap
} from '@/lib/api/orderApi';

function peso(amount: number) {
  return `₱${(amount ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/** Brand-coloured wordmarks (text, not official logo files). */
function WalletMark({channel}: {channel: PaymentChannel}) {
  switch (channel) {
    case 'gcash':
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0a5bd3] text-[13px] font-black text-white">
            G
          </span>
          <span className="text-[15px] font-extrabold tracking-tight text-[#0a5bd3] dark:text-[#5b9bff]">
            GCash
          </span>
        </span>
      );
    case 'maya':
      return (
        <span className="text-[17px] font-black lowercase tracking-tight text-[#00b464]">maya</span>
      );
    case 'grabpay':
      return (
        <span className="text-[15px] font-extrabold tracking-tight">
          <span className="text-[#00b14f]">Grab</span>
          <span className="text-gray-700 dark:text-gray-200">Pay</span>
        </span>
      );
    case 'shopeepay':
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ee4d2d] text-[12px] font-black text-white">
            S
          </span>
          <span className="text-[15px] font-extrabold tracking-tight text-[#ee4d2d]">ShopeePay</span>
        </span>
      );
    default:
      return null;
  }
}

function CardNetworks() {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      <span className="rounded bg-white px-1 text-[10px] font-black italic leading-4 text-[#1a1f71] ring-1 ring-gray-200">
        VISA
      </span>
      <span className="relative flex h-4 w-6 items-center rounded bg-white ring-1 ring-gray-200">
        <span className="absolute left-[3px] h-2.5 w-2.5 rounded-full bg-[#eb001b]" />
        <span className="absolute right-[3px] h-2.5 w-2.5 rounded-full bg-[#f79e1b] opacity-90" />
      </span>
      <span className="rounded bg-[#0e4c96] px-1 text-[9px] font-black leading-4 text-white">JCB</span>
      <span className="rounded bg-[#2e77bc] px-1 text-[9px] font-black leading-4 text-white">AMEX</span>
    </span>
  );
}

function SelectedTick() {
  return (
    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#2d4a35] text-white shadow-sm dark:bg-[#7ed4a0] dark:text-[#1b2e21]">
      <Check size={12} strokeWidth={3} aria-hidden />
    </span>
  );
}

function tileClass(selected: boolean) {
  return `relative flex w-full rounded-2xl border bg-white text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7c59]/40 dark:bg-gray-900 ${
    selected
      ? 'border-[#2d4a35] shadow-[0_0_0_3px_rgba(74,124,89,0.15)] dark:border-[#7ed4a0]'
      : 'border-gray-200 hover:border-[#4a7c59]/50 hover:shadow-sm dark:border-gray-700 dark:hover:border-[#7ed4a0]/40'
  }`;
}

/** An online Xendit channel, or cash at the store counter. */
export type PayOption = PaymentChannel | 'in_store';

/**
 * "Pay with" picker: e-wallet tiles with brand marks, then a card option,
 * then (when offered) In-store cash. Each tile shows its own service fee so
 * customers can compare.
 */
export default function PaymentChannelTiles({
  quotes,
  channels,
  channel,
  onChange,
  showOnline = true,
  inStore
}: {
  quotes: QuoteMap | null;
  channels: PaymentSummary['channels'];
  channel: PayOption;
  onChange: (c: PayOption) => void;
  /** False when Xendit is not configured: only In-store is offered. */
  showOnline?: boolean;
  /** Omit to hide the In-store option; `available: false` shows it disabled. */
  inStore?: {available: boolean; note?: string | null};
}) {
  const wallets = showOnline && quotes ? channels.filter(c => c.id !== 'card') : [];
  const card = showOnline && quotes ? channels.find(c => c.id === 'card') : undefined;

  const fee = (id: PaymentChannel) => {
    const q = quotes?.[id];
    if (!q) return null;
    return q.transactionFee > 0 ? `+${peso(q.transactionFee)} service fee` : 'No service fee';
  };

  return (
    <div role="radiogroup" aria-label="Pay with" className="space-y-3">
      {wallets.length > 0 ? (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            E-wallets
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {wallets.map(c => {
              const selected = channel === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={PAYMENT_CHANNEL_LABELS[c.id] ?? c.label}
                  onClick={() => onChange(c.id)}
                  className={`${tileClass(selected)} h-[72px] flex-col items-center justify-center gap-1 px-2`}
                >
                  {selected ? <SelectedTick /> : null}
                  <WalletMark channel={c.id} />
                  <span className="text-[11px] font-medium text-gray-400">{fee(c.id)}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {card ? (
        <>
          {wallets.length > 0 ? (
            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span className="text-[11px] text-gray-400">or pay with a debit/credit card</span>
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
          ) : null}
          <button
            type="button"
            role="radio"
            aria-checked={channel === 'card'}
            onClick={() => onChange('card')}
            className={`${tileClass(channel === 'card')} items-center gap-3 px-4 py-3.5`}
          >
            {channel === 'card' ? <SelectedTick /> : null}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2d4a35]/10 text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]">
              <CreditCard size={18} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">
                Credit / Debit card
              </span>
              <span className="block text-[11px] text-gray-400">{fee('card')}</span>
            </span>
            <span className="mr-6 hidden sm:block">
              <CardNetworks />
            </span>
          </button>
        </>
      ) : null}

      {inStore ? (
        <>
          {wallets.length > 0 || card ? (
            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span className="text-[11px] text-gray-400">or pay in cash at the store</span>
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
          ) : null}
          <button
            type="button"
            role="radio"
            aria-checked={channel === 'in_store'}
            disabled={!inStore.available}
            onClick={() => onChange('in_store')}
            className={`${tileClass(channel === 'in_store')} items-center gap-3 px-4 py-3.5 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {channel === 'in_store' ? <SelectedTick /> : null}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2d4a35]/10 text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]">
              <Store size={18} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">
                In-store
              </span>
              <span className="block text-[11px] text-gray-400">
                {inStore.note ?? 'Pay cash at the counter · No service fee'}
              </span>
            </span>
          </button>
        </>
      ) : null}

      {channel !== 'in_store' && (wallets.length > 0 || card) ? (
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck size={13} aria-hidden />
          You&apos;ll finish paying on a secure Xendit page.
        </p>
      ) : null}
    </div>
  );
}
