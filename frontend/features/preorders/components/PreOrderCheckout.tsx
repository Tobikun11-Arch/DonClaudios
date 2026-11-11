'use client';

import {useMemo, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  ArrowLeft,
  Bike,
  CalendarDays,
  Check,
  Clock,
  Info,
  Minus,
  Phone,
  Plus,
  Store,
  UtensilsCrossed
} from 'lucide-react';
import {toast} from 'sonner';
import {useOpenPreOrder, usePlacePreOrder} from '@/lib/hooks/preorders/usePreOrders';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import type {PreOrderEvent, PreOrderProduct, PreOrderSize} from '@/lib/api/preOrderApi';
import {manilaLongDate, peso} from '../utils';

type Picked = {productId: string; productName: string; size: PreOrderSize; quantity: number};
type Receive = 'pickup' | 'lalamove';

function StepTitle({n, title, hint}: {n: number; title: string; hint?: string}) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#2d4a35] text-sm font-bold text-white">
        {n}
      </span>
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        {hint && <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

function Stepper({
  value,
  max,
  onChange
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center rounded-full border border-[#d7e3da] bg-white dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        aria-label="Less"
        onClick={e => {
          e.stopPropagation();
          onChange(value - 1);
        }}
        className="grid h-8 w-8 place-items-center rounded-full text-[#2d4a35] hover:bg-[#e9f5ee] dark:text-[#7ed4a0] dark:hover:bg-[#7ed4a0]/10"
      >
        <Minus size={14} />
      </button>
      <span className="w-6 text-center text-sm font-bold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="More"
        disabled={value >= max}
        onClick={e => {
          e.stopPropagation();
          onChange(value + 1);
        }}
        className="grid h-8 w-8 place-items-center rounded-full text-[#2d4a35] hover:bg-[#e9f5ee] disabled:opacity-30 dark:text-[#7ed4a0] dark:hover:bg-[#7ed4a0]/10"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function ProductBlock({
  product,
  picked,
  heldQty,
  onSet
}: {
  product: PreOrderProduct;
  picked: Map<string, Picked>;
  /** Pieces per size this customer already holds in active orders. */
  heldQty: Record<string, number>;
  onSet: (product: PreOrderProduct, size: PreOrderSize, qty: number) => void;
}) {
  const allOut = product.sizes.every(s => s.soldOut);
  const maxSizes = product.maxSizes ?? 1;
  const held = product.sizes.filter(s => (heldQty[s._id] ?? 0) > 0).length;
  // Distinct sizes in use: already ordered or picked now.
  const inUse = product.sizes.filter(s => picked.has(s._id) || (heldQty[s._id] ?? 0) > 0).length;
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e3ece5] bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex gap-4 p-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f3f7f4] sm:h-24 sm:w-24 dark:bg-[#7ed4a0]/10">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill sizes="96px" className="object-cover" />
          ) : (
            <UtensilsCrossed className="absolute inset-0 m-auto h-8 w-8 text-[#9bb8a3]" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 dark:text-gray-100">{product.name}</p>
          {product.description && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{product.description}</p>}
          {!allOut && (
            <span className="mt-2 inline-block rounded-full bg-[#fff4dd] px-2.5 py-0.5 text-xs font-semibold text-[#9a6400] dark:bg-amber-500/10 dark:text-amber-300">
              {maxSizes === 1 ? 'Choose 1 size' : `Choose up to ${maxSizes} sizes`}
            </span>
          )}
          {allOut && (
            <span className="mt-2 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Sold out for this date
            </span>
          )}
        </div>
      </div>
      <div className="divide-y divide-[#eef3ef] border-t border-[#eef3ef] dark:divide-gray-800 dark:border-gray-800">
        {product.sizes.map(size => {
          const sel = picked.get(size._id);
          const already = heldQty[size._id] ?? 0;
          const max = Math.min(size.maxPerOrder - already, size.remaining);
          const few = !size.soldOut && size.remaining <= 3;
          // Another size would go over this product's size limit (a single
          // allowed size just switches the choice instead).
          const blocked =
            !sel &&
            (max <= 0 || (already === 0 && (maxSizes === 1 ? held > 0 : inUse >= maxSizes)));
          const disabled = size.soldOut || blocked;
          return (
            <div
              key={size._id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-pressed={!!sel}
              aria-disabled={disabled}
              onClick={() => !disabled && onSet(product, size, sel ? 0 : 1)}
              onKeyDown={e => {
                if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                  e.preventDefault();
                  onSet(product, size, sel ? 0 : 1);
                }
              }}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                disabled
                  ? 'cursor-not-allowed bg-gray-50/70 dark:bg-gray-800/50'
                  : sel
                    ? 'cursor-pointer bg-[#eef6f0] dark:bg-[#7ed4a0]/10'
                    : 'cursor-pointer hover:bg-[#f7faf6] dark:hover:bg-gray-800'
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                  sel ? 'border-[#2d4a35] bg-[#2d4a35] text-white' : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900'
                } ${maxSizes === 1 ? 'rounded-full' : ''} ${disabled ? 'opacity-40' : ''}`}
              >
                {sel && <Check size={13} strokeWidth={3} />}
              </span>
              <div className={`min-w-0 flex-1 ${disabled ? 'opacity-50' : ''}`}>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{size.label}</p>
                {size.description && <p className="text-xs text-gray-500 dark:text-gray-400">{size.description}</p>}
                {already > 0 && (
                  <p className="text-[0.7rem] font-semibold text-[#2d4a35] dark:text-[#7ed4a0]">In your pre-order: {already}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`text-sm font-bold ${size.soldOut ? 'text-gray-400 line-through' : 'text-[#2d4a35] dark:text-[#7ed4a0]'}`}>
                  {peso(size.price)}
                </span>
                {size.soldOut ? (
                  <span className="text-[0.7rem] font-semibold text-gray-500 dark:text-gray-400">Sold out</span>
                ) : few ? (
                  <span className="text-[0.7rem] font-semibold text-[#c30010] dark:text-red-400">Only {size.remaining} left</span>
                ) : null}
              </div>
              {sel && max > 1 && (
                <Stepper
                  value={sel.quantity}
                  max={max}
                  onChange={v => onSet(product, size, v)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderPanel({
  event,
  items,
  receive,
  slotLabel,
  notes,
  setNotes,
  canPlace,
  placing,
  onPlace
}: {
  event: PreOrderEvent;
  items: Picked[];
  receive: Receive | null;
  slotLabel: string | null;
  notes: string;
  setNotes: (v: string) => void;
  canPlace: boolean;
  placing: boolean;
  onPlace: () => void;
}) {
  const total = items.reduce((n, i) => n + i.size.price * i.quantity, 0);
  return (
    <div className="rounded-2xl border border-[#e3ece5] bg-white p-5 shadow-[0_8px_30px_rgba(45,74,53,0.06)] dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Your pre-order</p>
      <p className="mt-1 flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100">
        <CalendarDays size={16} className="text-[#2d4a35] dark:text-[#7ed4a0]" />
        {event.pickupDateLabel}
      </p>
      <p className="mt-0.5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <Clock size={15} className="text-[#2d4a35] dark:text-[#7ed4a0]" />
        {slotLabel ?? 'Choose a time slot'}
        {receive && <span className="text-gray-400">·</span>}
        {receive === 'pickup' ? 'Self pick-up' : receive === 'lalamove' ? 'Lalamove' : ''}
      </p>

      <div className="my-4 border-t border-dashed border-gray-200 dark:border-gray-800" />

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Choose a size to start your pre-order.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(i => (
            <li key={i.size._id} className="flex justify-between gap-3 text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                {i.quantity}× {i.productName}
                <span className="block text-xs text-gray-500 dark:text-gray-400">{i.size.label}</span>
              </span>
              <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{peso(i.size.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-baseline justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <span className="font-semibold text-gray-700 dark:text-gray-300">Total</span>
        <span className="text-2xl font-bold text-[#2d4a35] dark:text-[#7ed4a0]">{peso(total)}</span>
      </div>

      <label className="mt-4 block text-xs font-semibold text-gray-600 dark:text-gray-300" htmlFor="po-notes">
        Notes for the store (optional)
      </label>
      <textarea
        id="po-notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        maxLength={300}
        placeholder="e.g. Please chop the lechon"
        className="mt-1 min-h-[64px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-[#7ed4a0]/60"
      />

      <button
        type="button"
        disabled={!canPlace || placing}
        onClick={onPlace}
        className="mt-4 w-full rounded-full bg-[#2d4a35] py-3 text-sm font-bold text-white transition-colors hover:bg-[#3c5e45] disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
      >
        {placing ? 'Placing pre-order…' : 'Place pre-order'}
      </button>

      <ul className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
        <li className="flex gap-2">
          <Phone size={14} className="mt-0.5 shrink-0 text-[#2d4a35] dark:text-[#7ed4a0]" />
          No payment yet. We will call you to confirm, then you pay a down payment or the full
          amount online (GCash, Maya, card or bank).
        </li>
        <li className="flex gap-2">
          <Info size={14} className="mt-0.5 shrink-0 text-[#2d4a35] dark:text-[#7ed4a0]" />
          You can cancel until {manilaLongDate(event.cancelDeadline)} ({event.cancelCutoffDays} days
          before pickup).
        </li>
      </ul>
    </div>
  );
}

/** Shown instead of the form once the customer used up their orders for the date. */
function AlreadyOrdered({event}: {event: PreOrderEvent}) {
  const ids = event.mine?.orderIds ?? [];
  return (
    <div className="mx-auto w-full max-w-xl py-10 text-center">
      <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#e9f5ee] text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]">
        <Check size={28} strokeWidth={3} />
      </span>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{event.title}</p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">You already have a pre-order for this date</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {(event.maxOrdersPerCustomer ?? 1) === 1
          ? 'Each customer can place one pre-order per date.'
          : `Each customer can place up to ${event.maxOrdersPerCustomer} pre-orders per date.`}{' '}
        To change it, cancel your pre-order (until {manilaLongDate(event.cancelDeadline)}) and order again.
      </p>
      <div className="mt-6 flex flex-col items-center gap-2">
        {ids.map((id, i) => (
          <Link
            key={id}
            href={`/customer/dashboard/order-confirmation/${id}`}
            className="inline-flex items-center gap-2 rounded-full bg-[#2d4a35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#3c5e45]"
          >
            View my pre-order{ids.length > 1 ? ` #${i + 1}` : ''}
          </Link>
        ))}
        <Link href="/customer/dashboard" className="mt-1 text-sm font-semibold text-[#2d4a35] hover:underline dark:text-[#7ed4a0]">
          Back to menu
        </Link>
      </div>
    </div>
  );
}

export default function PreOrderCheckout({eventId}: {eventId: string}) {
  const router = useRouter();
  const {data: event, isLoading, isError} = useOpenPreOrder(eventId);
  const place = usePlacePreOrder(eventId);
  const [picked, setPicked] = useState<Map<string, Picked>>(new Map());
  const [receive, setReceive] = useState<Receive | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Drop picks that sold out (or shrank) since the page was opened.
  const items = useMemo(() => {
    if (!event) return [];
    const live = new Map(event.products.flatMap(p => p.sizes.map(s => [s._id, s] as const)));
    return [...picked.values()]
      .map(p => {
        const size = live.get(p.size._id);
        if (!size || size.soldOut) return null;
        const held = event.mine?.sizeQty[size._id] ?? 0;
        const max = Math.min(size.maxPerOrder - held, size.remaining);
        return {...p, size, quantity: Math.min(p.quantity, max)};
      })
      .filter((p): p is Picked => !!p && p.quantity > 0);
  }, [picked, event]);

  const slot = event?.slots.find(s => s._id === slotId && !s.full) ?? null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-1 py-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">This pre-order date is not open</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">It may be closed or fully booked.</p>
        <Link
          href="/customer/dashboard"
          className="mt-5 inline-block rounded-full bg-[#2d4a35] px-5 py-2.5 text-sm font-bold text-white"
        >
          Back to menu
        </Link>
      </div>
    );
  }

  if (event.mine && event.mine.orderIds.length >= (event.maxOrdersPerCustomer ?? 1)) {
    return <AlreadyOrdered event={event} />;
  }

  const setQty = (product: PreOrderProduct, size: PreOrderSize, qty: number) => {
    setPicked(prev => {
      const next = new Map(prev);
      // Only one size allowed: picking another replaces the previous choice.
      if (qty > 0 && (product.maxSizes ?? 1) === 1 && !next.has(size._id)) {
        for (const s of product.sizes) next.delete(s._id);
      }
      if (qty <= 0) next.delete(size._id);
      else next.set(size._id, {productId: product.productId, productName: product.name, size, quantity: qty});
      return next;
    });
  };

  const canPlace = items.length > 0 && !!receive && !!slot;

  const submit = async () => {
    if (!canPlace || !receive || !slot) return;
    try {
      const order = await place.mutateAsync({
        items: items.map(i => ({productId: i.productId, sizeId: i.size._id, quantity: i.quantity})),
        slotId: slot._id,
        receiveMethod: receive,
        notes: notes.trim() || undefined
      });
      toast.success('Pre-order placed! We will call you to confirm.');
      router.push(`/customer/dashboard/order-confirmation/${order._id}`);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Could not place your pre-order. Please try again.'));
    }
  };

  const panel = (
    <OrderPanel
      event={event}
      items={items}
      receive={receive}
      slotLabel={slot?.label ?? null}
      notes={notes}
      setNotes={setNotes}
      canPlace={canPlace}
      placing={place.isPending}
      onPlace={submit}
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl pb-8">
      <Link
        href="/customer/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2d4a35] hover:underline dark:text-[#7ed4a0]"
      >
        <ArrowLeft size={16} /> Back to menu
      </Link>

      <div className="mb-8 overflow-hidden rounded-2xl bg-[#3c5e45] px-6 py-7 sm:px-8">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-[#fbd897]">Holiday Pre-order</p>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{event.title}</h1>
        <p className="mt-1 flex items-center gap-2 text-white/80">
          <CalendarDays size={16} /> Pickup on {event.pickupDateLabel}
        </p>
        {event.description && <p className="mt-3 max-w-2xl text-sm text-white/70">{event.description}</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-10">
          <section>
            <StepTitle
              n={1}
              title="Choose your lechon"
              hint="Each product shows how many sizes you can choose. Sizes have limited pieces."
            />
            <div className="space-y-4">
              {event.products.map(p => (
                <ProductBlock
                  key={p._id}
                  product={p}
                  picked={picked}
                  heldQty={event.mine?.sizeQty ?? {}}
                  onSet={setQty}
                />
              ))}
            </div>
          </section>

          <section>
            <StepTitle n={2} title="How will you receive it?" />
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                {
                  key: 'pickup',
                  icon: Store,
                  title: 'Self pick-up',
                  text: 'Pick it up at the store at your chosen time. You may pay the balance in cash.'
                },
                {
                  key: 'lalamove',
                  icon: Bike,
                  title: 'Lalamove (you book it)',
                  text: 'You book the Lalamove rider yourself to collect at your chosen time. Payment is online only.'
                }
              ] as const).map(opt => {
                const active = receive === opt.key;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setReceive(opt.key)}
                    aria-pressed={active}
                    className={`flex gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
                      active ? 'border-[#2d4a35] bg-[#eef6f0] dark:bg-[#7ed4a0]/10 dark:border-[#7ed4a0]/60' : 'border-[#e3ece5] bg-white hover:border-[#2d4a35]/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-[#7ed4a0]/40'
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        active ? 'bg-[#2d4a35] text-white' : 'bg-[#e9f5ee] text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]'
                      }`}
                    >
                      <Icon size={20} />
                    </span>
                    <span>
                      <span className="block font-bold text-gray-900 dark:text-gray-100">{opt.title}</span>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">{opt.text}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {receive === 'lalamove' && (
              <p className="mt-3 flex gap-2 rounded-xl bg-[#fff8e8] p-3 text-sm text-[#7a5200] dark:bg-amber-500/10 dark:text-amber-300">
                <Info size={16} className="mt-0.5 shrink-0" />
                The store does not book or pay for the courier. Book your Lalamove to arrive at the
                store within your time slot.
              </p>
            )}
          </section>

          <section>
            <StepTitle
              n={3}
              title="Pickup time"
              hint={`On ${event.pickupDateLabel}. Slots close when they are full.`}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {event.slots.map(s => {
                const active = slotId === s._id && !s.full;
                return (
                  <button
                    key={s._id}
                    type="button"
                    disabled={s.full}
                    onClick={() => setSlotId(s._id)}
                    aria-pressed={active}
                    className={`rounded-xl border-2 px-3 py-3 text-center transition-colors ${
                      s.full
                        ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-800/50'
                        : active
                          ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
                          : 'border-[#e3ece5] bg-white text-gray-900 hover:border-[#2d4a35]/40 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-[#7ed4a0]/40'
                    }`}
                  >
                    <span className="block text-sm font-bold">{s.label}</span>
                    <span
                      className={`block text-[0.7rem] font-medium ${
                        active ? 'text-white/80' : s.full ? '' : s.remaining <= 5 ? 'text-[#c30010] dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {s.full ? 'Full' : s.remaining <= 5 ? `${s.remaining} left` : 'Available'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6">{panel}</div>
        </aside>
        <div className="lg:hidden">{panel}</div>
      </div>
    </div>
  );
}
