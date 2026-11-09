'use client';

import {useState, type ReactNode} from 'react';
import {
  CalendarClock,
  CalendarDays,
  Copy,
  Eye,
  EyeOff,
  ListOrdered,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {
  useDeletePreOrder,
  useDuplicatePreOrder,
  useOwnerPreOrders,
  useSetPreOrderStatus
} from '@/lib/hooks/preorders/usePreOrders';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import type {PreOrderEvent} from '@/lib/api/preOrderApi';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';
import PreOrderEditor from './PreOrderEditor';
import PreOrderOrders from './PreOrderOrders';
import {STATUS_STYLE, daysUntil, nextDay, peso, shortDate, weekday} from '@/features/preorders/utils';

type View = {kind: 'list'} | {kind: 'edit'; id: string | null} | {kind: 'orders'; id: string};

function Dialog({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full rounded-t-2xl border border-gray-100 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:max-w-md sm:rounded-2xl"
      >
        <p className="mb-3 text-base font-bold text-gray-900 dark:text-gray-100">{title}</p>
        {children}
      </div>
    </div>
  );
}

function Meter({used, total}: {used: number; total: number}) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
      <div
        className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-[#4a7c59] dark:bg-[#7ed4a0]'}`}
        style={{width: `${pct}%`}}
      />
    </div>
  );
}

function EventCard({
  event,
  onEdit,
  onOrders,
  onDuplicate,
  onDelete
}: {
  event: PreOrderEvent;
  onEdit: () => void;
  onOrders: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const setStatus = useSetPreOrderStatus();
  const status = STATUS_STYLE[event.status];
  const sizes = event.products.flatMap(p => p.sizes);
  const pieces = sizes.reduce((n, s) => n + (s.stock ?? 0), 0);
  const sold = sizes.reduce((n, s) => n + (s.sold ?? 0), 0);
  const slotTotal = event.slots.reduce((n, s) => n + (s.limit ?? 0), 0);
  const slotUsed = event.slots.reduce((n, s) => n + (s.booked ?? 0), 0);
  const days = daysUntil(event.pickupDate);
  const past = days < 0;
  const orderCount = event.orderCount ?? 0;

  const changeStatus = async (next: PreOrderEvent['status']) => {
    try {
      await setStatus.mutateAsync({id: event._id, status: next});
      toast.success(
        next === 'published'
          ? 'Pre-order is open. Customers were notified.'
          : next === 'closed'
            ? 'Pre-order closed to new orders'
            : 'Moved back to draft'
      );
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Could not change the status'));
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#2d4a35] text-white dark:bg-[#4a7c59]">
          <span className="text-[0.65rem] font-semibold uppercase leading-none tracking-wider opacity-80">
            {shortDate(event.pickupDate).split(' ')[0]}
          </span>
          <span className="text-xl font-bold leading-tight">{shortDate(event.pickupDate).split(' ')[1]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{event.title}</p>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {weekday(event.pickupDate)} ·{' '}
            {past ? 'Pickup date has passed' : days === 0 ? 'Pickup today' : `${days} days to go`}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="mb-1 flex justify-between text-gray-500 dark:text-gray-400">
            <span>Pieces ordered</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {sold}/{pieces}
            </span>
          </div>
          <Meter used={sold} total={pieces} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-gray-500 dark:text-gray-400">
            <span>Slots booked</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {slotUsed}/{slotTotal}
            </span>
          </div>
          <Meter used={slotUsed} total={slotTotal} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {event.products.length} products · {sizes.length} sizes
        </span>
        <span>
          <b className="text-gray-900 dark:text-gray-100">{orderCount}</b> {orderCount === 1 ? 'order' : 'orders'} ·{' '}
          {peso(event.orderValue ?? 0)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
        <Button size="sm" variant="outline" onClick={onOrders}>
          <ListOrdered size={14} /> Orders
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil size={14} /> Edit
        </Button>
        {event.status === 'published' ? (
          <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => changeStatus('closed')}>
            <EyeOff size={14} /> Close
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={setStatus.isPending || past}
            onClick={() => changeStatus('published')}
            className="bg-[#2d4a35] text-white hover:bg-[#3a5c44] dark:bg-[#4a7c59] dark:hover:bg-[#5a8f6a]"
          >
            <Eye size={14} /> {event.status === 'closed' ? 'Reopen' : 'Open to customers'}
          </Button>
        )}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicate to another date"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Copy size={15} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={orderCount > 0}
            title={orderCount > 0 ? 'Dates with orders cannot be deleted. Close it instead.' : 'Delete'}
            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-red-500/10"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PreOrdersPage() {
  const {data: events = [], isLoading} = useOwnerPreOrders();
  const [view, setView] = useState<View>({kind: 'list'});
  const [dupFrom, setDupFrom] = useState<PreOrderEvent | null>(null);
  const [dupTitle, setDupTitle] = useState('');
  const [dupDate, setDupDate] = useState('');
  const [deleting, setDeleting] = useState<PreOrderEvent | null>(null);
  const duplicate = useDuplicatePreOrder();
  const remove = useDeletePreOrder();

  if (view.kind === 'edit') {
    const event = view.id ? (events.find(e => e._id === view.id) ?? null) : null;
    return (
      <PreOrderEditor
        key={view.id ?? 'new'}
        event={event}
        allEvents={events}
        onDone={() => setView({kind: 'list'})}
      />
    );
  }
  if (view.kind === 'orders') {
    const event = events.find(e => e._id === view.id);
    if (event) return <PreOrderOrders event={event} onBack={() => setView({kind: 'list'})} />;
  }

  const upcoming = events.filter(e => daysUntil(e.pickupDate) >= 0);
  const past = events.filter(e => daysUntil(e.pickupDate) < 0);

  const openDuplicate = (e: PreOrderEvent) => {
    setDupFrom(e);
    setDupTitle(`${e.title} (copy)`);
    setDupDate(nextDay(e.pickupDate));
  };

  const submitDuplicate = async () => {
    if (!dupFrom) return;
    try {
      await duplicate.mutateAsync({id: dupFrom._id, title: dupTitle.trim(), pickupDate: dupDate});
      toast.success('Copied as a new draft date');
      setDupFrom(null);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Could not duplicate this date'));
    }
  };

  const submitDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting._id);
      toast.success('Pre-order date deleted');
      setDeleting(null);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Could not delete this date'));
    }
  };

  const grid = (list: PreOrderEvent[]) => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {list.map(e => (
        <EventCard
          key={e._id}
          event={e}
          onEdit={() => setView({kind: 'edit', id: e._id})}
          onOrders={() => setView({kind: 'orders', id: e._id})}
          onDuplicate={() => openDuplicate(e)}
          onDelete={() => setDeleting(e)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            <CalendarClock className="h-6 w-6 text-[#2d4a35] dark:text-[#7ed4a0]" />
            Pre-orders
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Open pickup dates ahead of time, choose the products and sizes, and set limits per size
            and per time slot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setView({kind: 'edit', id: null})}
            className="bg-[#2d4a35] text-white hover:bg-[#3a5c44] dark:bg-[#4a7c59] dark:hover:bg-[#5a8f6a]"
          >
            <Plus size={16} /> New date
          </Button>
          <OwnerNotificationBell />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({length: 3}).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-gray-400" />
          <p className="font-semibold text-gray-800 dark:text-gray-200">No pre-order dates yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create a date such as Dec 24 and add the products customers can reserve.
          </p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && grid(upcoming)}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Past dates
              </h2>
              {grid(past)}
            </div>
          )}
        </>
      )}

      <Dialog open={!!dupFrom} title="Duplicate pre-order date" onClose={() => setDupFrom(null)}>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Copies the products, sizes, prices, limits and slots into a new draft. Orders are not
          copied.
        </p>
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={dupTitle}
            onChange={e => setDupTitle(e.target.value)}
            aria-label="Title"
          />
          <input
            type="date"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={dupDate}
            onChange={e => setDupDate(e.target.value)}
            aria-label="Pickup date"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDupFrom(null)}>
            Cancel
          </Button>
          <Button
            disabled={duplicate.isPending || !dupTitle.trim() || !dupDate}
            onClick={submitDuplicate}
            className="bg-[#2d4a35] text-white hover:bg-[#3a5c44] dark:bg-[#4a7c59] dark:hover:bg-[#5a8f6a]"
          >
            {duplicate.isPending ? 'Copying…' : 'Duplicate'}
          </Button>
        </div>
      </Dialog>

      <Dialog open={!!deleting} title="Delete this pre-order date?" onClose={() => setDeleting(null)}>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <b>{deleting?.title}</b> ({deleting?.pickupDateLabel}) will be removed. This cannot be
          undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button
            disabled={remove.isPending}
            onClick={submitDelete}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
