'use client';

import {useMemo, useState} from 'react';
import Image from 'next/image';
import {ArrowLeft, Clock, Info, Plus, Trash2, UtensilsCrossed} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import {useSavePreOrderEvent} from '@/lib/hooks/preorders/usePreOrders';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import type {PreOrderEvent, PreOrderEventInput} from '@/lib/api/preOrderApi';
import type {Product} from '@/lib/types/product';
import {
  DEFAULT_CANCEL_CUTOFF_DAYS,
  DEFAULT_MAX_PER_ORDER,
  DEFAULT_SIZE_STOCK,
  DEFAULT_SLOTS,
  DEFAULT_SLOT_LIMIT
} from '@/features/preorders/utils';

type SizeDraft = {
  key: string;
  _id?: string;
  label: string;
  description: string;
  price: string;
  stock: string;
  maxPerOrder: string;
  sold: number;
};
type ProductDraft = {key: string; _id?: string; productId: string; maxSizes: string; sizes: SizeDraft[]};
type SlotDraft = {key: string; _id?: string; label: string; startTime: string; limit: string; booked: number};

let seq = 0;
const k = () => `k${++seq}`;

const blankSize = (): SizeDraft => ({
  key: k(),
  label: '',
  description: '',
  price: '',
  stock: String(DEFAULT_SIZE_STOCK),
  maxPerOrder: String(DEFAULT_MAX_PER_ORDER),
  sold: 0
});

function fromEvent(event: PreOrderEvent | null) {
  if (!event) {
    return {
      title: '',
      pickupDate: '',
      description: '',
      cancelCutoffDays: String(DEFAULT_CANCEL_CUTOFF_DAYS),
      maxOrdersPerCustomer: '1',
      products: [] as ProductDraft[],
      slots: DEFAULT_SLOTS.map(s => ({
        key: k(),
        label: s.label,
        startTime: s.startTime,
        limit: String(DEFAULT_SLOT_LIMIT),
        booked: 0
      })) as SlotDraft[]
    };
  }
  return {
    title: event.title,
    pickupDate: event.pickupDate,
    description: event.description ?? '',
    cancelCutoffDays: String(event.cancelCutoffDays),
    maxOrdersPerCustomer: String(event.maxOrdersPerCustomer ?? 1),
    products: event.products.map(p => ({
      key: k(),
      _id: p._id,
      productId: p.productId,
      maxSizes: String(p.maxSizes ?? 1),
      sizes: p.sizes.map(s => ({
        key: k(),
        _id: s._id,
        label: s.label,
        description: s.description ?? '',
        price: String(s.price),
        stock: String(s.stock ?? s.remaining),
        maxPerOrder: String(s.maxPerOrder),
        sold: s.sold ?? 0
      }))
    })),
    slots: event.slots.map(s => ({
      key: k(),
      _id: s._id,
      label: s.label,
      startTime: s.startTime,
      limit: String(s.limit ?? s.remaining),
      booked: s.booked ?? 0
    }))
  };
}

const inputCls =
  'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/30 focus:border-[#4a7c59]';
/** Same look without `w-full`, for short number boxes with their own width. */
const numCls = inputCls.replace('w-full ', '');
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1';
const cardCls =
  'rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]';

type Props = {
  event: PreOrderEvent | null;
  /** Other dates, used to prefill sizes when a product is added. */
  allEvents: PreOrderEvent[];
  onDone: () => void;
};

export default function PreOrderEditor({event, allEvents, onDone}: Props) {
  const [form, setForm] = useState(() => fromEvent(event));
  const [picker, setPicker] = useState('');
  const save = useSavePreOrderEvent();
  const {data: productsData} = useProductsQuery({includePreOrderOnly: true});

  const allProducts: Product[] = useMemo(() => productsData?.products ?? [], [productsData]);
  const productById = useMemo(() => new Map(allProducts.map(p => [p._id, p])), [allProducts]);
  // Names/photos for products already on the date (in case the list hides them).
  const eventProductInfo = useMemo(
    () => new Map((event?.products ?? []).map(p => [p.productId, p])),
    [event]
  );

  const chosen = new Set(form.products.map(p => p.productId));
  const options = allProducts
    .filter(p => !chosen.has(p._id))
    .sort((a, b) => Number(!!b.preOrderOnly) - Number(!!a.preOrderOnly) || a.name.localeCompare(b.name));

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(f => ({...f, [key]: value}));

  const updateProduct = (key: string, fn: (p: ProductDraft) => ProductDraft) =>
    set('products', form.products.map(p => (p.key === key ? fn(p) : p)));

  const updateSize = (pKey: string, sKey: string, patch: Partial<SizeDraft>) =>
    updateProduct(pKey, p => ({
      ...p,
      sizes: p.sizes.map(s => (s.key === sKey ? {...s, ...patch} : s))
    }));

  const addProduct = (productId: string) => {
    if (!productId) return;
    // Prefill sizes from the most recent date that sells this product.
    const previous = allEvents
      .filter(e => e._id !== event?._id)
      .flatMap(e => e.products)
      .find(p => p.productId === productId);
    const sizes: SizeDraft[] = previous
      ? previous.sizes.map(s => ({
          key: k(),
          label: s.label,
          description: s.description ?? '',
          price: String(s.price),
          stock: String(s.stock ?? DEFAULT_SIZE_STOCK),
          maxPerOrder: String(s.maxPerOrder),
          sold: 0
        }))
      : [blankSize()];
    set('products', [...form.products, {key: k(), productId, maxSizes: String(previous?.maxSizes ?? 1), sizes}]);
    setPicker('');
  };

  const updateSlot = (key: string, patch: Partial<SlotDraft>) =>
    set('slots', form.slots.map(s => (s.key === key ? {...s, ...patch} : s)));

  const submit = async () => {
    if (!form.title.trim()) return toast.error('Give this pre-order date a title');
    if (!form.pickupDate) return toast.error('Choose the pickup date');
    const input: PreOrderEventInput = {
      title: form.title.trim(),
      pickupDate: form.pickupDate,
      description: form.description.trim() || null,
      cancelCutoffDays: Number(form.cancelCutoffDays || 0),
      maxOrdersPerCustomer: Number(form.maxOrdersPerCustomer || 1),
      products: form.products.map(p => ({
        _id: p._id,
        productId: p.productId,
        maxSizes: Number(p.maxSizes || 1),
        sizes: p.sizes.map(s => ({
          _id: s._id,
          label: s.label.trim(),
          description: s.description.trim() || null,
          price: Number(s.price),
          stock: Number(s.stock),
          maxPerOrder: Number(s.maxPerOrder || DEFAULT_MAX_PER_ORDER)
        }))
      })),
      slots: form.slots.map(s => ({
        _id: s._id,
        label: s.label.trim(),
        startTime: s.startTime,
        limit: Number(s.limit)
      }))
    };
    try {
      await save.mutateAsync({id: event?._id, input});
      toast.success(event ? 'Pre-order date saved' : 'Pre-order date created as a draft');
      onDone();
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Could not save the pre-order date'));
    }
  };

  const totalSizes = form.products.reduce((n, p) => n + p.sizes.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDone}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Back to pre-order dates"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {event ? 'Edit pre-order date' : 'New pre-order date'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {event?.status === 'published'
                ? 'This date is open to customers. Changes show right away.'
                : 'Saved as a draft. Customers see it only after you open it.'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={save.isPending}
            className="bg-[#2d4a35] text-white hover:bg-[#3a5c44] dark:bg-[#4a7c59] dark:hover:bg-[#5a8f6a]"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Details */}
      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">Date details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Christmas Eve Pre-order"
              maxLength={80}
            />
          </div>
          <div>
            <label className={labelCls}>Pickup date</label>
            <input
              type="date"
              className={inputCls}
              value={form.pickupDate}
              onChange={e => set('pickupDate', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Customers can cancel until</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                className={`${numCls} w-20`}
                value={form.cancelCutoffDays}
                onChange={e => set('cancelCutoffDays', e.target.value)}
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">days before pickup</span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Pre-orders per customer</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className={`${numCls} w-20`}
                value={form.maxOrdersPerCustomer}
                onChange={e => set('maxOrdersPerCustomer', e.target.value)}
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {form.maxOrdersPerCustomer === '1' ? 'order for this date' : 'orders for this date'}
              </span>
            </div>
            <p className="mt-1 text-[0.7rem] text-gray-500 dark:text-gray-400">
              A customer who reaches this cannot pre-order again for this date unless they cancel.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Note for customers (optional)</label>
            <textarea
              className={`${inputCls} min-h-[72px]`}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Orders are confirmed by phone. Payment is needed after the confirmation call."
              maxLength={500}
            />
          </div>
        </div>
      </section>

      {/* Products and sizes */}
      <section className={cardCls}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Products and sizes</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {form.products.length} products · {totalSizes} sizes. The limit counts pieces; a size
              closes when it reaches its limit.
            </p>
          </div>
          <select
            className={`${inputCls} w-full sm:w-64`}
            value={picker}
            onChange={e => addProduct(e.target.value)}
          >
            <option value="">+ Add a product…</option>
            {options.map(p => (
              <option key={p._id} value={p._id}>
                {p.name}
                {p.preOrderOnly ? ' (pre-order only)' : ''}
              </option>
            ))}
          </select>
        </div>

        {form.products.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <UtensilsCrossed className="mx-auto mb-2 h-6 w-6 opacity-60" />
            Add the products customers can pre-order for this date.
          </div>
        )}

        <div className="space-y-4">
          {form.products.map(p => {
            const prod = productById.get(p.productId);
            const info = eventProductInfo.get(p.productId);
            const name = prod?.name ?? info?.name ?? 'Product';
            const image = prod?.imageUrl ?? info?.imageUrl ?? null;
            const hasSold = p.sizes.some(s => s.sold > 0);
            return (
              <div
                key={p.key}
                className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#e9f5ee] dark:bg-[#7ed4a0]/10">
                      {image ? (
                        <Image src={image} alt={name} fill sizes="40px" className="object-cover" />
                      ) : (
                        <UtensilsCrossed className="m-2.5 h-5 w-5 text-[#4a7c59] dark:text-[#7ed4a0]" />
                      )}
                    </div>
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{name}</p>
                  </div>
                  <label className="ml-auto flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="hidden sm:inline">Sizes per customer</span>
                    <span className="sm:hidden">Sizes</span>
                    <input
                      type="number"
                      min={1}
                      max={p.sizes.length}
                      aria-label={`Sizes of ${name} one customer can choose`}
                      className={`${numCls} w-16 py-1.5`}
                      value={p.maxSizes}
                      onChange={e => updateProduct(p.key, x => ({...x, maxSizes: e.target.value}))}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={hasSold}
                    title={hasSold ? 'This product already has orders' : 'Remove product'}
                    onClick={() => set('products', form.products.filter(x => x.key !== p.key))}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="hidden grid-cols-[1.6fr_1.4fr_0.75fr_0.6fr_0.6fr_auto] gap-2 px-1 pb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 md:grid">
                  <span>Size</span>
                  <span>Details</span>
                  <span>Price</span>
                  <span>Limit</span>
                  <span>Max / customer</span>
                  <span className="w-8" />
                </div>
                <div className="space-y-2">
                  {p.sizes.map(s => (
                    <div
                      key={s.key}
                      className="grid grid-cols-2 gap-2 rounded-lg bg-white dark:bg-gray-900 p-2 md:grid-cols-[1.6fr_1.4fr_0.75fr_0.6fr_0.6fr_auto] md:bg-transparent md:p-0 dark:md:bg-transparent"
                    >
                      <input
                        className={`${inputCls} col-span-2 md:col-span-1`}
                        placeholder="Size, e.g. 4-5 KG"
                        value={s.label}
                        onChange={e => updateSize(p.key, s.key, {label: e.target.value})}
                      />
                      <input
                        className={`${inputCls} col-span-2 md:col-span-1`}
                        placeholder="e.g. Good for 12-15 pax"
                        value={s.description}
                        onChange={e => updateSize(p.key, s.key, {description: e.target.value})}
                      />
                      <input
                        type="number"
                        min={1}
                        className={inputCls}
                        placeholder="Price"
                        aria-label="Price"
                        value={s.price}
                        onChange={e => updateSize(p.key, s.key, {price: e.target.value})}
                      />
                      <div>
                        <input
                          type="number"
                          min={Math.max(s.sold, 0)}
                          className={inputCls}
                          aria-label="Limit (pieces)"
                          value={s.stock}
                          onChange={e => updateSize(p.key, s.key, {stock: e.target.value})}
                        />
                        {s.sold > 0 && (
                          <p className="mt-0.5 text-[0.68rem] text-gray-500 dark:text-gray-400">
                            {s.sold} ordered
                          </p>
                        )}
                      </div>
                      <input
                        type="number"
                        min={1}
                        className={inputCls}
                        aria-label="Max per customer"
                        value={s.maxPerOrder}
                        onChange={e => updateSize(p.key, s.key, {maxPerOrder: e.target.value})}
                      />
                      <button
                        type="button"
                        disabled={s.sold > 0 || p.sizes.length === 1}
                        title={s.sold > 0 ? 'This size already has orders' : 'Remove size'}
                        onClick={() =>
                          updateProduct(p.key, x => ({...x, sizes: x.sizes.filter(y => y.key !== s.key)}))
                        }
                        className="justify-self-end rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => updateProduct(p.key, x => ({...x, sizes: [...x.sizes, blankSize()]}))}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#2d4a35] hover:bg-[#e9f5ee] dark:text-[#7ed4a0] dark:hover:bg-[#7ed4a0]/10"
                >
                  <Plus size={14} /> Add size
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Slots */}
      <section className={cardCls}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Pickup time slots</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The limit is how many orders each slot takes. Lalamove orders use the slot as the
              booking time.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set('slots', [
                ...form.slots,
                {key: k(), label: '', startTime: '', limit: String(DEFAULT_SLOT_LIMIT), booked: 0}
              ])
            }
          >
            <Plus size={14} /> Add slot
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {form.slots.map(s => (
            <div
              key={s.key}
              className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-2"
            >
              <Clock size={16} className="ml-1 shrink-0 text-[#4a7c59] dark:text-[#7ed4a0]" />
              <input
                className={`${inputCls} min-w-0 flex-1`}
                placeholder="Label, e.g. 8 - 9 AM"
                value={s.label}
                onChange={e => updateSlot(s.key, {label: e.target.value})}
              />
              <input
                type="time"
                className={`${inputCls} w-[7.5rem]`}
                aria-label="Start time"
                value={s.startTime}
                onChange={e => updateSlot(s.key, {startTime: e.target.value})}
              />
              <div className="w-20">
                <input
                  type="number"
                  min={Math.max(s.booked, 1)}
                  className={inputCls}
                  aria-label="Order limit"
                  value={s.limit}
                  onChange={e => updateSlot(s.key, {limit: e.target.value})}
                />
                {s.booked > 0 && (
                  <p className="mt-0.5 text-[0.68rem] text-gray-500 dark:text-gray-400">{s.booked} booked</p>
                )}
              </div>
              <button
                type="button"
                disabled={s.booked > 0}
                title={s.booked > 0 ? 'This slot already has orders' : 'Remove slot'}
                onClick={() => set('slots', form.slots.filter(x => x.key !== s.key))}
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-500/10"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <p className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Info size={14} className="mt-0.5 shrink-0" />
        Customers pay a down payment or full payment online after your confirmation call. The
        balance can be paid in cash only for self pick-up.
      </p>
    </div>
  );
}
