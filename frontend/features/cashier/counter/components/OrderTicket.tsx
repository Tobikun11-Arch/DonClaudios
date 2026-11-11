'use client';

import {Loader2, Minus, Plus, ShoppingBag, Trash2, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
  PAYMENT_METHODS,
  peso,
  quickCashAmounts,
  type CartLine,
  type PaymentMethod
} from '../counterShared';

export type TicketBusy = 'charge' | 'save' | null;

export default function OrderTicket({
  cart,
  cartCount,
  total,
  editingLabel,
  onCancelEdit,
  onChangeQty,
  onRemove,
  onClear,
  method,
  onMethodChange,
  cashReceived,
  onCashReceivedChange,
  onCharge,
  onSave,
  busy
}: {
  cart: CartLine[];
  cartCount: number;
  total: number;
  editingLabel: string | null;
  onCancelEdit: () => void;
  onChangeQty: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  cashReceived: string;
  onCashReceivedChange: (value: string) => void;
  onCharge: () => void;
  onSave: () => void;
  busy: TicketBusy;
}) {
  const hasItems = cart.length > 0;
  const isBusy = busy !== null;
  const received = cashReceived.trim() === '' ? null : Number(cashReceived);
  const receivedValid = received !== null && Number.isFinite(received);
  const isCash = method === 'cash';
  const short = isCash && receivedValid && (received as number) < total;
  const change = isCash && receivedValid && !short ? (received as number) - total : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {editingLabel && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>
            Editing <span className="font-bold">{editingLabel}</span>
          </span>
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={isBusy}
            className="min-h-11 rounded-lg px-2 font-semibold text-amber-900 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Cancel edit
          </button>
        </div>
      )}

      {!hasItems ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-gray-400">
            <ShoppingBag className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-gray-700">No items yet</p>
          <p className="text-sm text-gray-500">Tap a menu item to add it.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 pt-3">
            <span className="text-sm text-gray-500">
              {cartCount} item{cartCount !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={onClear}
              disabled={isBusy}
              className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Clear
            </button>
          </div>
          <ul className="subtle-scrollbar min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto px-4">
            {cart.map(line => (
              <li key={line.productId} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {line.name}
                  </p>
                  <p className="text-xs tabular-nums text-gray-500">
                    {peso(line.price)} each
                  </p>
                </div>
                <div className="flex shrink-0 items-center rounded-xl border border-gray-200">
                  <button
                    type="button"
                    aria-label={
                      line.qty === 1 ? `Remove ${line.name}` : `Decrease ${line.name}`
                    }
                    onClick={() =>
                      line.qty === 1
                        ? onRemove(line.productId)
                        : onChangeQty(line.productId, -1)
                    }
                    disabled={isBusy}
                    className={cn(
                      'grid h-11 w-11 place-items-center rounded-l-xl hover:bg-gray-50 disabled:opacity-50',
                      line.qty === 1 ? 'text-red-500' : 'text-gray-700'
                    )}
                  >
                    {line.qty === 1 ? (
                      <Trash2 className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                  </button>
                  <span
                    className="w-8 text-center text-sm font-bold tabular-nums text-gray-900"
                    aria-live="polite"
                  >
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase ${line.name}`}
                    onClick={() => onChangeQty(line.productId, 1)}
                    disabled={isBusy || line.qty >= line.maxQty}
                    className="grid h-11 w-11 place-items-center rounded-r-xl text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums text-gray-900">
                  {peso(line.price * line.qty)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="space-y-3 border-t border-gray-100 px-4 pb-4 pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-gray-600">Total</span>
          <span className="text-2xl font-extrabold tabular-nums text-gray-900">
            {peso(total)}
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Payment method"
          className="grid grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1"
        >
          {PAYMENT_METHODS.map(option => {
            const active = option.value === method;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onMethodChange(option.value)}
                disabled={isBusy}
                className={cn(
                  'min-h-11 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60',
                  active
                    ? 'bg-white text-[#2d4a35] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {isCash && hasItems && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 focus-within:border-[#2d4a35] focus-within:ring-2 focus-within:ring-[#2d4a35]/20">
              <span className="shrink-0 text-sm text-gray-500">Cash received</span>
              <span className="ml-auto text-sm text-gray-400">₱</span>
              <input
                inputMode="decimal"
                value={cashReceived}
                onChange={event =>
                  onCashReceivedChange(event.target.value.replace(/[^0-9.]/g, ''))
                }
                placeholder={String(total)}
                disabled={isBusy}
                className="h-11 w-24 bg-transparent text-right text-base font-semibold tabular-nums text-gray-900 outline-none placeholder:text-gray-300"
              />
            </label>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {quickCashAmounts(total).map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => onCashReceivedChange(String(amount))}
                  disabled={isBusy}
                  className={cn(
                    'min-h-10 shrink-0 rounded-lg border px-3 text-sm font-semibold tabular-nums transition-colors',
                    receivedValid && received === amount
                      ? 'border-[#2d4a35] bg-[#2d4a35]/5 text-[#2d4a35]'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {amount === total ? 'Exact' : peso(amount)}
                </button>
              ))}
            </div>
            {short && (
              <p className="text-sm font-semibold text-red-600">
                {peso(total - (received as number))} short
              </p>
            )}
            {change !== null && (
              <div className="flex items-baseline justify-between rounded-xl bg-[#2d4a35]/5 px-3 py-2">
                <span className="text-sm font-semibold text-[#2d4a35]">
                  Change due
                </span>
                <span className="text-lg font-extrabold tabular-nums text-[#2d4a35]">
                  {peso(change)}
                </span>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onCharge}
          disabled={!hasItems || isBusy || short}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#2d4a35] text-lg font-bold tabular-nums text-white shadow-sm transition-colors hover:bg-[#24402b] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {busy === 'charge' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Charging…
            </>
          ) : (
            `Charge ${peso(total)}`
          )}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!hasItems || isBusy}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'save' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : editingLabel ? (
            'Save changes, pay later'
          ) : (
            'Save as unpaid'
          )}
        </button>
      </div>
    </div>
  );
}
