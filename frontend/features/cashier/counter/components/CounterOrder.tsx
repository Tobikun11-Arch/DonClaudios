'use client';

import {useEffect, useMemo, useState} from 'react';
import {ChevronUp, Search, X} from 'lucide-react';
import {toast} from 'sonner';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import {
  useCounterOrdersQuery,
  useCreateCounterOrderMutation,
  useMarkCounterOrderPaidMutation,
  useUpdateCounterOrderMutation
} from '@/lib/hooks/orders/useCashierCounterOrder';
import type {CounterOrderEntry} from '@/lib/api/orderApi';
import type {Product} from '@/lib/types/product';
import CashierNotificationBell from '@/features/cashier/notifications/components/CashierNotificationBell';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {FilterPills} from '@/shared/components/FilterPills';
import {cn} from '@/lib/utils';
import {
  PAYMENT_METHODS,
  orderLabel,
  peso,
  type CartLine,
  type PaymentMethod
} from '../counterShared';
import ProductTile from './ProductTile';
import OrderTicket, {type TicketBusy} from './OrderTicket';
import RecentOrders from './RecentOrders';
import CounterDialog from './CounterDialog';
import CounterOrderReceipt from './CounterOrderReceipt';

type PanelTab = 'order' | 'recent';

type ConfirmState = {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

type CompletedSale = {
  order: CounterOrderEntry;
  cashReceived: number | null;
};

const ALL = 'all';

export default function CounterOrder() {
  const {data: productsData, isLoading} = useProductsQuery();
  const products = useMemo(
    () => productsData?.products ?? [],
    [productsData?.products]
  );
  // Pre-order items are never sold at the counter (the backend rejects them).
  // Sold-out / unavailable items stay visible as disabled tiles.
  const menuProducts = useMemo(
    () => products.filter(p => !p.isPreOrder && !p.preOrderOnly),
    [products]
  );

  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [chargeMethod, setChargeMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [panelTab, setPanelTab] = useState<PanelTab>('order');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState<TicketBusy>(null);

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderNumber, setEditingOrderNumber] = useState<string | null>(
    null
  );

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<CounterOrderEntry | null>(
    null
  );
  const [paidMethod, setPaidMethod] = useState<PaymentMethod | null>(null);
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<CounterOrderEntry | null>(
    null
  );

  // Escape closes the phone order sheet, like the other counter dialogs. Not
  // while a save/charge is running, and not when a dialog sits on top of it
  // (that dialog handles its own Escape).
  const dialogOnTop =
    !!confirmState || !!markPaidTarget || !!completedSale || !!receiptOrder;
  useEffect(() => {
    if (!sheetOpen || busy !== null || dialogOnTop) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen, busy, dialogOnTop]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          menuProducts
            .map(p => p.category)
            .filter(c => typeof c === 'string' && c.trim().length > 0)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [menuProducts]
  );

  const categoryPills = useMemo(
    () => [
      {key: ALL, label: 'All'},
      ...categories.map(c => ({key: c, label: c}))
    ],
    [categories]
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sellable = (p: Product) => p.isAvailable && p.stock > 0;
    return menuProducts
      .filter(p => {
        const matchesCategory =
          activeCategory === ALL || p.category === activeCategory;
        const matchesQuery =
          !normalizedQuery || p.name.toLowerCase().includes(normalizedQuery);
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => Number(sellable(b)) - Number(sellable(a)));
  }, [menuProducts, activeCategory, query]);

  const qtyByProduct = useMemo(
    () => new Map(cart.map(c => [c.productId, c.qty])),
    [cart]
  );
  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.qty, 0), [cart]);
  const orderTotal = useMemo(
    () => cart.reduce((s, c) => s + c.price * c.qty, 0),
    [cart]
  );

  // Stock checks (and their toasts) happen outside the setCart updater:
  // React may run updaters twice, which used to show the warning twice.
  const addToCart = (product: Product) => {
    if (!product.isAvailable || product.stock <= 0) return;
    const existing = cart.find(c => c.productId === product._id);
    if (existing && existing.qty + 1 > existing.maxQty) {
      toast.warning(`Only ${existing.maxQty} left in stock`);
      return;
    }
    setCart(prev => {
      const current = prev.find(c => c.productId === product._id);
      if (current) {
        if (current.qty + 1 > current.maxQty) return prev;
        return prev.map(c =>
          c.productId === product._id ? {...c, qty: c.qty + 1} : c
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          qty: 1,
          maxQty: product.stock
        }
      ];
    });
    setPanelTab('order');
  };

  const changeQty = (productId: string, delta: number) => {
    const target = cart.find(c => c.productId === productId);
    if (!target) return;
    const next = target.qty + delta;
    if (next < 1) {
      removeLine(productId);
      return;
    }
    if (next > target.maxQty) {
      toast.warning(`Only ${target.maxQty} left in stock`);
      return;
    }
    setCart(prev =>
      prev.map(c => (c.productId === productId ? {...c, qty: next} : c))
    );
  };

  const removeLine = (productId: string) => {
    setCart(prev => prev.filter(c => c.productId !== productId));
  };

  const createOrder = useCreateCounterOrderMutation();
  const updateOrder = useUpdateCounterOrderMutation();
  const markPaid = useMarkCounterOrderPaidMutation();
  const {data: historyData, isLoading: historyLoading} = useCounterOrdersQuery();
  const history = useMemo(() => historyData?.orders ?? [], [historyData]);
  const recentOrders = useMemo(() => history.slice(0, 20), [history]);
  const unpaidCount = useMemo(
    () =>
      recentOrders.filter(
        o => o.paymentStatus !== 'paid' && o.orderStatus !== 'cancelled'
      ).length,
    [recentOrders]
  );

  const resetForm = () => {
    setCart([]);
    setEditingOrderId(null);
    setEditingOrderNumber(null);
    setCashReceived('');
  };

  const handleClear = () => {
    setConfirmState({
      title: editingOrderId ? 'Discard changes?' : 'Clear this order?',
      body: editingOrderId
        ? `${editingOrderNumber} stays as it was.`
        : 'All items will be removed from the ticket.',
      confirmLabel: editingOrderId ? 'Discard' : 'Clear order',
      destructive: true,
      onConfirm: resetForm
    });
  };

  const applyEdit = (order: CounterOrderEntry) => {
    const lines: CartLine[] = (order.items ?? []).map(item => {
      const pid =
        typeof item.productId === 'string'
          ? item.productId
          : item.productId?._id ?? '';
      const product = products.find(p => p._id === pid);
      const originalQty = item.quantity;
      const stock = product?.stock ?? 0;
      const maxQty = Math.max(originalQty, stock + originalQty);
      return {
        productId: pid,
        name:
          product?.name ??
          (typeof item.productId === 'object'
            ? item.productId?.name ?? 'Item'
            : 'Item'),
        price: item.price ?? product?.price ?? 0,
        imageUrl:
          product?.imageUrl ??
          (typeof item.productId === 'object'
            ? item.productId?.imageUrl
            : undefined),
        qty: item.quantity,
        maxQty,
        originalQty
      };
    });

    setCart(lines);
    setCashReceived('');
    setEditingOrderId(order._id);
    setEditingOrderNumber(orderLabel(order));
    setPanelTab('order');
  };

  const loadOrderForEdit = (order: CounterOrderEntry) => {
    if (order.paymentStatus === 'paid') return;
    if (cart.length > 0 && editingOrderId !== order._id) {
      setConfirmState({
        title: `Edit ${orderLabel(order)}?`,
        body: 'The items on the current ticket will be discarded.',
        confirmLabel: 'Discard and edit',
        destructive: true,
        onConfirm: () => applyEdit(order)
      });
      return;
    }
    applyEdit(order);
  };

  const buildBody = () => ({
    items: cart.map(c => ({
      productId: c.productId,
      quantity: c.qty,
      price: c.price
    })),
    totalAmount: orderTotal
  });

  /** Creates (or updates) the order; returns its id and label, or null. */
  const saveOrder = async (): Promise<{id: string; label: string} | null> => {
    const body = buildBody();
    try {
      if (editingOrderId) {
        const result = await updateOrder.mutateAsync({
          orderId: editingOrderId,
          body
        });
        return {
          id: editingOrderId,
          label: result.order?.orderNumber ?? editingOrderNumber ?? 'Order'
        };
      }
      const result = await createOrder.mutateAsync(body);
      return {
        id: result.order._id,
        label: result.order?.orderNumber ?? 'Order'
      };
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to save order'));
      return null;
    }
  };

  const handleSaveUnpaid = async () => {
    if (cart.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    setBusy('save');
    const wasEditing = !!editingOrderId;
    const saved = await saveOrder();
    setBusy(null);
    if (!saved) return;
    toast.success(
      wasEditing ? `Order ${saved.label} updated.` : `Order ${saved.label} saved as unpaid.`
    );
    resetForm();
    setSheetOpen(false);
  };

  const handleCharge = async () => {
    if (cart.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    const received =
      chargeMethod === 'cash' && cashReceived.trim() !== ''
        ? Number(cashReceived)
        : null;
    if (received !== null && (!Number.isFinite(received) || received < orderTotal)) {
      toast.error('Cash received is less than the total');
      return;
    }

    setBusy('charge');
    const lines = cart;
    const saved = await saveOrder();
    if (!saved) {
      setBusy(null);
      return;
    }
    try {
      const result = await markPaid.mutateAsync({
        orderId: saved.id,
        paymentMethod: chargeMethod
      });
      setCompletedSale({
        order: {
          ...result.order,
          items: lines.map(line => ({
            productId: line.productId,
            name: line.name,
            quantity: line.qty,
            price: line.price
          }))
        },
        cashReceived: received
      });
    } catch (err: unknown) {
      toast.error(
        `${saved.label} was saved but not marked as paid: ${getFriendlyErrorMessage(err, 'please mark it as paid from Recent')}`
      );
      setPanelTab('recent');
    } finally {
      setBusy(null);
      resetForm();
      setSheetOpen(false);
    }
  };

  const closeMarkPaid = () => {
    setMarkPaidTarget(null);
    setPaidMethod(null);
    setMarkPaidError(null);
  };

  const confirmMarkPaid = async () => {
    if (!markPaidTarget || !paidMethod) return;
    setMarkPaidError(null);
    try {
      await markPaid.mutateAsync({
        orderId: markPaidTarget._id,
        paymentMethod: paidMethod
      });
      toast.success(`${orderLabel(markPaidTarget)} marked as paid.`);
      if (editingOrderId === markPaidTarget._id) resetForm();
      closeMarkPaid();
    } catch (err: unknown) {
      setMarkPaidError(getFriendlyErrorMessage(err, 'Failed to mark as paid'));
    }
  };

  const renderPanel = () => (
    <>
      <div className="p-3 pb-0">
        <div
          role="tablist"
          aria-label="Order panel"
          className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1"
        >
          {(
            [
              {key: 'order', label: 'Current order', badge: cartCount},
              {key: 'recent', label: 'Recent', badge: unpaidCount}
            ] as const
          ).map(tab => {
            const active = panelTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPanelTab(tab.key)}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors',
                  active
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span
                    className={cn(
                      'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums',
                      tab.key === 'recent'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-[#2d4a35] text-white'
                    )}
                    aria-label={
                      tab.key === 'recent'
                        ? `${tab.badge} unpaid`
                        : `${tab.badge} items`
                    }
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {panelTab === 'order' ? (
        <OrderTicket
          cart={cart}
          cartCount={cartCount}
          total={orderTotal}
          editingLabel={editingOrderId ? editingOrderNumber : null}
          onCancelEdit={resetForm}
          onChangeQty={changeQty}
          onRemove={removeLine}
          onClear={handleClear}
          method={chargeMethod}
          onMethodChange={method => {
            setChargeMethod(method);
            if (method !== 'cash') setCashReceived('');
          }}
          cashReceived={cashReceived}
          onCashReceivedChange={setCashReceived}
          onCharge={handleCharge}
          onSave={handleSaveUnpaid}
          busy={busy}
        />
      ) : (
        <RecentOrders
          orders={recentOrders}
          loading={historyLoading}
          editingOrderId={editingOrderId}
          markPaidPending={markPaid.isPending}
          onMarkPaid={order => {
            setPaidMethod(null);
            setMarkPaidError(null);
            setMarkPaidTarget(order);
          }}
          onEdit={loadOrderForEdit}
          onViewReceipt={setReceiptOrder}
        />
      )}
    </>
  );

  return (
    <div className="flex min-h-full flex-col gap-4 lg:h-[calc(100dvh-3rem)] lg:min-h-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2d4a35]">Walk-in Order</h1>
          <p className="text-sm text-gray-500">
            Ring up counter sales and settle open tickets.
          </p>
        </div>
        <CashierNotificationBell />
      </div>

      <div className="flex flex-1 flex-col gap-4 lg:min-h-0 lg:flex-row">
        {/* Menu */}
        <section
          aria-label="Menu"
          className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white lg:min-h-0"
        >
          <div className="space-y-3 border-b border-gray-100 p-3 sm:p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search menu"
                aria-label="Search menu"
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#2d4a35] focus:bg-white focus:ring-2 focus:ring-[#2d4a35]/20 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-gray-400 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {categories.length > 0 && (
              <FilterPills
                items={categoryPills}
                value={activeCategory}
                onChange={setActiveCategory}
                ariaLabel="Category"
              />
            )}
          </div>

          <div className="subtle-scrollbar p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {Array.from({length: 8}).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[4/5] animate-pulse rounded-2xl bg-gray-100"
                  />
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">
                {query.trim()
                  ? `No items match “${query.trim()}”.`
                  : 'No items in this category.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visibleProducts.map(product => (
                  <ProductTile
                    key={product._id}
                    product={product}
                    qtyInOrder={qtyByProduct.get(product._id) ?? 0}
                    onAdd={() => addToCart(product)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Ticket (lg+) */}
        <aside
          aria-label="Order"
          className="hidden min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white lg:flex lg:w-[380px] xl:w-[420px]"
        >
          {renderPanel()}
        </aside>
      </div>

      {/* Phone/tablet order bar: sits above the cashier bottom nav (72px +
          safe area) below md, and at the bottom edge from md to lg. */}
      <div className="sticky bottom-[calc(80px_+_env(safe-area-inset-bottom,10px))] z-30 md:bottom-4 lg:hidden">
        <button
          type="button"
          onClick={() => {
            setPanelTab(cart.length > 0 || unpaidCount === 0 ? 'order' : 'recent');
            setSheetOpen(true);
          }}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-[#2d4a35] px-4 py-2 text-left text-white shadow-lg shadow-[#2d4a35]/30"
        >
          <span className="min-w-0">
            {cart.length > 0 ? (
              <span className="block truncate text-base font-bold tabular-nums">
                {cartCount} item{cartCount !== 1 ? 's' : ''} · {peso(orderTotal)}
              </span>
            ) : (
              <span className="block truncate text-sm font-semibold text-white/80">
                {unpaidCount > 0
                  ? `No items · ${unpaidCount} unpaid order${unpaidCount !== 1 ? 's' : ''}`
                  : 'No items yet'}
              </span>
            )}
            {editingOrderId && (
              <span className="block text-xs text-white/70">
                Editing {editingOrderNumber}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold">
            {cart.length > 0 || unpaidCount === 0 ? 'View order' : 'Recent'}
            <ChevronUp className="h-4 w-4" />
          </span>
        </button>
      </div>

      {/* Phone/tablet ticket sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => (busy ? undefined : setSheetOpen(false))}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Order"
            className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-2xl md:inset-x-auto md:right-4 md:bottom-4 md:w-[420px] md:rounded-3xl"
          >
            <div className="relative flex h-11 items-center justify-center">
              <span className="h-1 w-10 rounded-full bg-gray-200" />
              <button
                type="button"
                aria-label="Close"
                disabled={busy !== null}
                onClick={() => setSheetOpen(false)}
                className="absolute right-1 top-0 grid h-11 w-11 place-items-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{renderPanel()}</div>
          </div>
        </div>
      )}

      <CounterDialog
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title}
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmState(null)}
              className="min-h-11 flex-1 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                confirmState?.onConfirm();
                setConfirmState(null);
              }}
              className={cn(
                'min-h-11 flex-1 rounded-xl text-sm font-semibold text-white',
                confirmState?.destructive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[#2d4a35] hover:bg-[#24402b]'
              )}
            >
              {confirmState?.confirmLabel}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">{confirmState?.body}</p>
      </CounterDialog>

      <CounterDialog
        open={!!markPaidTarget}
        onClose={closeMarkPaid}
        dismissible={!markPaid.isPending}
        title={markPaidTarget ? `Mark ${orderLabel(markPaidTarget)} as paid` : ''}
        footer={
          <>
            <button
              type="button"
              onClick={closeMarkPaid}
              disabled={markPaid.isPending}
              className="min-h-11 flex-1 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmMarkPaid}
              disabled={!paidMethod || markPaid.isPending}
              className="min-h-11 flex-1 rounded-xl bg-[#2d4a35] text-sm font-semibold text-white hover:bg-[#24402b] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {markPaid.isPending ? 'Saving…' : 'Confirm payment'}
            </button>
          </>
        }
      >
        {markPaidTarget && (
          <>
            <div className="flex items-baseline justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-600">Amount due</span>
              <span className="text-2xl font-extrabold tabular-nums text-gray-900">
                {peso(markPaidTarget.totalAmount)}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-700">
              Payment method
            </p>
            <div
              role="radiogroup"
              aria-label="Payment method"
              className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {PAYMENT_METHODS.map(method => {
                const active = paidMethod === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPaidMethod(method.value)}
                    className={cn(
                      'min-h-12 rounded-xl border text-sm font-semibold transition-colors',
                      active
                        ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>
            {markPaidError && (
              <p className="mt-3 text-sm text-red-600">{markPaidError}</p>
            )}
          </>
        )}
      </CounterDialog>

      <CounterDialog
        open={!!completedSale}
        onClose={() => setCompletedSale(null)}
        title="Payment complete"
        footer={
          <button
            type="button"
            autoFocus
            onClick={() => setCompletedSale(null)}
            className="min-h-12 flex-1 rounded-xl bg-[#2d4a35] text-base font-bold text-white hover:bg-[#24402b]"
          >
            New sale
          </button>
        }
      >
        {completedSale && (
          <div className="space-y-4">
            {completedSale.cashReceived !== null &&
              completedSale.cashReceived > completedSale.order.totalAmount && (
                <div className="rounded-2xl bg-[#2d4a35]/5 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-[#2d4a35]">Change due</p>
                  <p className="text-3xl font-extrabold tabular-nums text-[#2d4a35]">
                    {peso(
                      completedSale.cashReceived - completedSale.order.totalAmount
                    )}
                  </p>
                </div>
              )}
            <CounterOrderReceipt
              order={completedSale.order}
              cashReceived={completedSale.cashReceived}
            />
          </div>
        )}
      </CounterDialog>

      <CounterDialog
        open={!!receiptOrder}
        onClose={() => setReceiptOrder(null)}
        title={receiptOrder ? orderLabel(receiptOrder) : ''}
      >
        {receiptOrder && <CounterOrderReceipt order={receiptOrder} />}
      </CounterDialog>
    </div>
  );
}
