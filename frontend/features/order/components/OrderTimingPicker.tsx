'use client';

import {useEffect, useMemo} from 'react';
import {CalendarClock, Info, Zap} from 'lucide-react';
import {cn} from '@/lib/utils';
import {useScheduleQuote} from '@/lib/hooks/useOrderSchedule';
import {
  formatDayChip,
  formatDuration,
  formatPeso,
  formatStoreDateTime,
  receiveWord,
  type OrderTiming,
  type ScheduleQuote
} from '@/lib/orders/orderSchedule';

export type TimingSelection = {
  timing: OrderTiming;
  day: string | null;
  time: string | null;
};

export const DEFAULT_TIMING: TimingSelection = {timing: 'asap', day: null, time: null};

type CheckoutOrderType = 'Delivery' | 'Pick-up' | 'Reservation';

export function toApiOrderType(orderType: CheckoutOrderType) {
  return orderType === 'Delivery' ? 'delivery' : orderType === 'Pick-up' ? 'pickup' : 'reservation';
}

/**
 * Is the selection good to place? Returns the reason when not (shown under
 * the Place order button).
 */
export function timingProblem(
  selection: TimingSelection,
  quote: ScheduleQuote | undefined
): string | null {
  if (!quote) return null; // still loading: the server re-checks anyway
  if (selection.timing === 'asap') {
    if (!quote.asapAllowed) return 'This order needs advance notice. Please choose Pre-order and pick a time.';
    if (!quote.storeOpenNow) return 'The store is closed right now. Choose Pre-order to order for a later time.';
    return null;
  }
  if (!selection.day || !selection.time) return 'Choose a date and time for your pre-order.';
  const day = quote.days.find(d => d.day === selection.day);
  const slot = day?.slots.find(s => s.time === selection.time);
  if (!slot || !slot.available) {
    return quote.firstAvailableLabel
      ? `Date too soon. Available starting ${quote.firstAvailableLabel}.`
      : 'That time is no longer available. Please pick another.';
  }
  return null;
}

type Props = {
  orderType: CheckoutOrderType;
  items: {productId: string; quantity: number}[];
  value: TimingSelection;
  onChange: (value: TimingSelection) => void;
  /** Lets the page read the quote (for button state / notices). */
  onQuote?: (quote: ScheduleQuote | undefined) => void;
};

/**
 * "When do you want it?" on the checkout: ASAP or Pre-order with a date and
 * an hourly slot from Store Status. Bulk (₱X+) and lechon carts must
 * pre-order; slots that are too soon are shown but disabled.
 */
export default function OrderTimingPicker({orderType, items, value, onChange, onQuote}: Props) {
  const apiType = toApiOrderType(orderType);
  const quoteQuery = useScheduleQuote(apiType, items);
  const quote = quoteQuery.data;

  useEffect(() => {
    onQuote?.(quote);
  }, [quote, onQuote]);

  // Keep the selection valid as the cart / clock changes:
  //  - bulk / lechon cart -> force Pre-order;
  //  - pre-order without a day -> jump to the first available slot.
  useEffect(() => {
    if (!quote) return;
    if (value.timing === 'asap' && !quote.asapAllowed) {
      onChange({
        timing: 'scheduled',
        day: quote.firstAvailable?.day ?? null,
        time: quote.firstAvailable?.time ?? null
      });
      return;
    }
    if (value.timing === 'scheduled' && !value.day && quote.firstAvailable) {
      onChange({timing: 'scheduled', day: quote.firstAvailable.day, time: quote.firstAvailable.time});
    }
  }, [quote, value, onChange]);

  const selectedDay = useMemo(
    () => quote?.days.find(d => d.day === value.day) ?? null,
    [quote, value.day]
  );

  const req = quote?.requirement;
  const rules = quote?.rules;
  const word = receiveWord(orderType);

  const pickTiming = (timing: OrderTiming) => {
    if (timing === 'asap') onChange({timing: 'asap', day: null, time: null});
    else
      onChange({
        timing: 'scheduled',
        day: value.day ?? quote?.firstAvailable?.day ?? null,
        time: value.time ?? quote?.firstAvailable?.time ?? null
      });
  };

  // Date picker bounds: first day with a free slot ... last bookable day.
  const dateMin =
    quote?.days.find(d => d.slots.some(s => s.available))?.day ?? quote?.days[0]?.day;
  const dateMax = quote?.days[quote.days.length - 1]?.day;
  const dayNote = !quote || !value.day
    ? null
    : !selectedDay
      ? `Please choose a date between ${dateMin ? formatDayChip(dateMin).date : 'today'} and ${dateMax ? formatDayChip(dateMax).date : 'later'}.`
      : selectedDay.closed
        ? 'The store is closed on this day. Please pick another date.'
        : !selectedDay.slots.some(s => s.available)
          ? `No times left on this day. Available starting ${quote.firstAvailableLabel ?? 'a later date'}.`
          : null;

  const pickDay = (day: string) => {
    const d = quote?.days.find(x => x.day === day);
    const keep = d?.slots.find(s => s.time === value.time && s.available);
    const first = d?.slots.find(s => s.available);
    onChange({timing: 'scheduled', day, time: keep?.time ?? first?.time ?? null});
  };

  const asapDisabled = quote ? !quote.asapAllowed : false;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">When do you want it?</p>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Order timing">
        {(
          [
            {
              id: 'asap' as const,
              title: 'Order now (ASAP)',
              sub: asapDisabled
                ? req?.tier === 'lechon'
                  ? 'Not available for lechon'
                  : 'Not available for large orders'
                : quote && !quote.storeOpenNow
                  ? 'Store is closed now'
                  : 'Prepared right after confirmation',
              icon: Zap,
              disabled: asapDisabled
            },
            {
              id: 'scheduled' as const,
              title: 'Pre-order / Schedule',
              sub: `Pick a ${word} date & time`,
              icon: CalendarClock,
              disabled: false
            }
          ]
        ).map(opt => {
          const selected = value.timing === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={opt.disabled}
              onClick={() => pickTiming(opt.id)}
              className={cn(
                'flex items-start gap-3 rounded-2xl border-[1.5px] p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c5e45]/40 disabled:cursor-not-allowed disabled:opacity-50',
                selected
                  ? 'border-[#3c5e45] bg-[#3c5e45]/10 dark:border-[#7ed4a0] dark:bg-[#7ed4a0]/10'
                  : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  selected
                    ? 'bg-[#3c5e45] text-white'
                    : 'bg-gray-100 text-[#3c5e45] dark:bg-gray-800 dark:text-[#7ed4a0]'
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {opt.title}
                </span>
                <span className="block text-[11px] text-gray-500 dark:text-gray-400">{opt.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {quote && req?.advanceOnly ? (
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {req.tier === 'lechon' ? (
              <>
                <span className="font-semibold">Lechon takes hours to prepare.</span> Your order needs at
                least {formatDuration(req.leadMinutes)} notice.
              </>
            ) : (
              <>
                <span className="font-semibold">
                  Large orders ({formatPeso(rules?.bulkMinSubtotal ?? 0)} and up) need advance notice.
                </span>{' '}
                Please allow at least {formatDuration(req.leadMinutes)}.
              </>
            )}{' '}
            Orders placed in the evening are ready the next afternoon at the earliest.
            {quote.firstAvailableLabel ? (
              <>
                {' '}
                Earliest available: <span className="font-semibold">{quote.firstAvailableLabel}</span>.
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {value.timing === 'scheduled' ? (
        <div className="space-y-3 rounded-2xl border border-gray-200 p-3 dark:border-gray-700">
          {quoteQuery.isLoading ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">Loading available times…</p>
          ) : quoteQuery.isError ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              Could not load available times. Please refresh the page.
            </p>
          ) : quote ? (
            <>
              <div>
                <label
                  htmlFor="order-timing-date"
                  className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  Date
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    id="order-timing-date"
                    type="date"
                    required
                    value={value.day ?? ''}
                    min={dateMin}
                    max={dateMax}
                    onChange={e => e.target.value && pickDay(e.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 focus:border-[#3c5e45] focus:outline-none focus:ring-2 focus:ring-[#3c5e45]/20 sm:w-56 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:scheme-dark"
                  />
                  {value.day ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDayChip(value.day).weekday}, {formatDayChip(value.day).date}
                    </span>
                  ) : null}
                </div>
                {dayNote ? (
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{dayNote}</p>
                ) : null}
              </div>

              {selectedDay ? (
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {word === 'dine-in' ? 'Dine-in time' : word === 'delivery' ? 'Delivery time' : 'Pick-up time'}
                  </p>
                  {selectedDay.slots.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">The store is closed on this day.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {selectedDay.slots.map(s => {
                        const selected = s.time === value.time;
                        return (
                          <button
                            key={s.time}
                            type="button"
                            disabled={!s.available}
                            aria-pressed={selected}
                            onClick={() => onChange({timing: 'scheduled', day: selectedDay.day, time: s.time})}
                            title={s.available ? undefined : 'Too soon'}
                            className={cn(
                              'rounded-xl border px-2 py-2 text-xs font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:border-dashed disabled:opacity-40',
                              selected
                                ? 'border-[#3c5e45] bg-[#3c5e45] text-white dark:border-[#7ed4a0] dark:bg-[#7ed4a0] dark:text-gray-900'
                                : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                            )}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedDay.slots.some(s => !s.available) && quote.firstAvailableLabel ? (
                    <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                      Greyed-out times are too soon. Available starting {quote.firstAvailableLabel}.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {value.day && value.time ? (
                <p className="rounded-xl bg-[#3c5e45]/5 px-3 py-2 text-xs text-gray-700 dark:bg-[#7ed4a0]/10 dark:text-gray-200">
                  Your order will be ready for {word} on{' '}
                  <span className="font-semibold">
                    {formatStoreDateTime(
                      selectedDay?.slots.find(s => s.time === value.time)?.at ?? null
                    )}
                  </span>
                  .
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
