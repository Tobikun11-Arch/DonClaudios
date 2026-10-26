'use client';

import {useMemo, useState} from 'react';
import Image from 'next/image';
import {
  Minus,
  Plus,
  Search,
  Trash2,
  ClipboardList,
  Pencil,
  Check,
  X,
  Loader2
} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';

import {
  useCounterOrdersQuery,
  useCreateCounterOrderMutation,
  useMarkCounterOrderPaidMutation,
  useUpdateCounterOrderMutation
} from '@/lib/hooks/orders/useCashierCounterOrder';
import type {CounterOrderEntry} from '@/lib/api/orderApi';
import SplashGate from '@/shared/components/SplashGate';
import CashierNotificationBell from '@/features/cashier/notifications/components/CashierNotificationBell';

type CartLine = {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  qty: number;
  maxQty: number;
  originalQty?: number;
};

const PAYMENT_METHODS = [
  {value: 'cash', label: 'Cash'},
  {value: 'card', label: 'Card'},
  {value: 'gcash', label: 'GCash'},
  {value: 'other', label: 'Other'}
] as const;

function orderLabel(order: CounterOrderEntry): string {
  return order.orderNumber ?? `DC-${String(order._id).slice(-6).toUpperCase()}`;
}

function paymentMethodLabel(value?: string | null): string {
  return PAYMENT_METHODS.find(m => m.value === value)?.label ?? 'Cash';
}

export default function CounterOrder() {
  const {data: productsData, isLoading, isError} = useProductsQuery();
  const products = useMemo(
    () => productsData?.products ?? [],
    [productsData?.products]
  );
  const availableProducts = useMemo(
    () => products.filter(p => p.isAvailable && p.stock > 0 && !p.isPreOrder),
    [products]
  );

  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]['value']>('cash');

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderNumber, setEditingOrderNumber] = useState<string | null>(
    null
  );
  const [markPaidTarget, setMarkPaidTarget] = useState<CounterOrderEntry | null>(
    null
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          availableProducts
            .map(p => p.category)
            .filter(c => typeof c === 'string' && c.trim().length > 0)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [availableProducts]
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return availableProducts.filter(p => {
      const matchesCategory =
        !activeCategory || p.category === activeCategory;
      const matchesQuery =
        !normalizedQuery || p.name.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [availableProducts, activeCategory, query]);

  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.qty, 0), [cart]);
  const orderTotal = useMemo(
    () => cart.reduce((s, c) => s + c.price * c.qty, 0),
    [cart]
  );

  const addToCart = (product: (typeof availableProducts)[number]) => {
    setCart(prev => {
      const existing = prev.find(c => c.productId === product._id);
      if (existing) {
        if (existing.qty + 1 > existing.maxQty) {
          toast.warning(`Only ${existing.maxQty} left in stock`);
          return prev;
        }
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
  };

  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const changeQty = (productId: string, delta: number) => {
    setCart(prev => {
      const target = prev.find(c => c.productId === productId);
      if (!target) return prev;
      const next = target.qty + delta;
      if (next < 1) {
        setRemoveTarget(productId);
        return prev;
      }
      if (next > target.maxQty) {
        toast.warning(`Only ${target.maxQty} left in stock`);
        return prev;
      }
      return prev.map(c =>
        c.productId === productId ? {...c, qty: next} : c
      );
    });
  };

  const removeLine = (productId: string) => {
    setRemoveTarget(productId);
  };

  const confirmRemoveItem = () => {
    if (!removeTarget) return;
    setCart(prev => prev.filter(c => c.productId !== removeTarget));
    setRemoveTarget(null);
  };

  const createOrder = useCreateCounterOrderMutation();
  const updateOrder = useUpdateCounterOrderMutation();
  const markPaid = useMarkCounterOrderPaidMutation();
  const {data: historyData, isLoading: historyLoading} = useCounterOrdersQuery();
  const history = useMemo(() => historyData?.orders ?? [], [historyData]);
  const recentOrders = useMemo(() => history.slice(0, 10), [history]);

  const resetForm = () => {
    setCart([]);
    setPaymentMethod('cash');
    setEditingOrderId(null);
    setEditingOrderNumber(null);
  };

  const loadOrderForEdit = (order: CounterOrderEntry) => {
    if (order.paymentStatus === 'paid') return;
    if (cart.length > 0 && !editingOrderId) {
      const label = orderLabel(order);
      if (!window.confirm(`Discard the current order and edit ${label}?`)) {
        return;
      }
    }

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
    setPaymentMethod(
      (order.paymentMethod as (typeof PAYMENT_METHODS)[number]['value']) ??
        'cash'
    );
    setEditingOrderId(order._id);
    setEditingOrderNumber(orderLabel(order));
  };

  const handleSave = async () => {
    if (cart.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    const body = {
      items: cart.map(c => ({
        productId: c.productId,
        quantity: c.qty,
        price: c.price
      })),
      totalAmount: orderTotal,
      paymentMethod
    };

    try {
      if (editingOrderId) {
        const result = await updateOrder.mutateAsync({
          orderId: editingOrderId,
          body
        });
        const label = result.order?.orderNumber ?? editingOrderNumber;
        toast.success(`Order ${label} updated.`);
      } else {
        const result = await createOrder.mutateAsync(body);
        const label = result.order?.orderNumber ?? 'recorded';
        toast.success(`Order ${label} recorded.`);
      }
      resetForm();
    } catch (err: unknown) {
      const message =
        (err as {message?: string})?.message ?? 'Failed to save order';
      toast.error(message);
    }
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const confirmMarkPaid = async () => {
    if (!markPaidTarget) return;
    try {
      await markPaid.mutateAsync(markPaidTarget._id);
      toast.success(`${orderLabel(markPaidTarget)} marked as paid.`);
      setMarkPaidTarget(null);
    } catch (err: unknown) {
      const message =
        (err as {message?: string})?.message ?? 'Failed to mark as paid';
      toast.error(message);
    }
  };

  const hasCart = cart.length > 0;
  const hasRecent = recentOrders.length > 0;
  const showRightColumn = hasCart || hasRecent;

  return (
    <div className="flex min-h-full flex-col gap-4 lg:h-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2d4a35]">
            Walk-in Order
          </h1>
          <p className="text-sm text-gray-500">
            Record walk-in orders and track their payment status.
          </p>
        </div>
        <CashierNotificationBell />
      </div>

      <div className="flex flex-1 flex-col gap-4 lg:h-full lg:flex-row">
        <SplashGate ready={productsData !== undefined || isError} />
        <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                DonClaudio&apos;s Menu
              </h2>
              <p className="text-sm text-gray-500">
                Select items to add to the order
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search menu"
                aria-label="Search menu"
                className="pl-9"
              />
            </div>
          </div>

          <div className="mb-4">
            <Label className="text-xs font-medium" htmlFor="walkin-category">
              Category
            </Label>
            <select
              id="walkin-category"
              value={activeCategory ?? 'all'}
              onChange={e =>
                setActiveCategory(e.target.value === 'all' ? null : e.target.value)
              }
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20 sm:w-64"
            >
              <option value="all">All</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {isLoading && (
            <div className="text-sm text-gray-500">Loading products...</div>
          )}

          {!isLoading && visibleProducts.length === 0 && (
            <div className="text-sm text-gray-500">
              No products available in this category.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map(product => (
              <div
                key={product._id}
                className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs"
              >
                <div className="relative h-32 w-full">
                  <Image
                    src={
                      product.imageUrl && product.imageUrl.length > 0
                        ? product.imageUrl
                        : '/assets/sample_menu.png'
                    }
                    alt={product.name}
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="line-clamp-2 min-h-10 text-sm font-medium text-gray-800">
                    {product.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    ₱{product.price.toLocaleString()}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2 bg-[#3c5e45] text-white hover:bg-[#2d4a35]"
                    onClick={() => addToCart(product)}
                  >
                    <Plus className="h-4 w-4" /> Add to order
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showRightColumn && (
          <div className="flex flex-col gap-4 lg:h-full">
            {hasCart && (
              <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 lg:w-96">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <ClipboardList className="h-5 w-5 text-[#c30010]" />
                    {editingOrderId ? `Editing ${editingOrderNumber}` : 'Order Details'}
                  </h2>
                  <span className="rounded-full bg-[#3c5e45]/10 px-3 py-1 text-sm font-semibold text-[#3c5e45]">
                    {cartCount} item{cartCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="flex-1 text-sm text-gray-400">
                    No items yet. Select from the menu.
                  </div>
                ) : (
                  <div className="max-h-48 flex-1 space-y-2 overflow-auto">
                    {cart.map(line => (
                      <div
                        key={line.productId}
                        className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 p-2"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            <Image
                              src={
                                line.imageUrl && line.imageUrl.length > 0
                                  ? line.imageUrl
                                  : '/assets/sample_menu.png'
                              }
                              alt={line.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">
                              {line.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              ₱{line.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => changeQty(line.productId, -1)}
                            className="grid h-9 w-9 place-items-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQty(line.productId, 1)}
                            className="grid h-9 w-9 place-items-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLine(line.productId)}
                            className="ml-1 grid h-9 w-9 place-items-center rounded-md text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-sm text-gray-500">Order Total</span>
                  <span className="text-xl font-bold text-gray-900">
                    ₱{orderTotal.toLocaleString()}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <Label className="text-xs font-medium">Payment method</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {PAYMENT_METHODS.map(method => (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setPaymentMethod(method.value)}
                          className={
                            'rounded-full px-3 py-1.5 min-h-[40px] text-sm font-medium transition-colors ' +
                            (paymentMethod === method.value
                              ? 'bg-[#3c5e45] text-white'
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50')
                          }
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sticky bottom-20 z-10 -mx-4 mt-1 bg-white px-4 py-3 md:bottom-0 lg:static lg:mx-0 lg:mt-4 lg:p-0">
                    <div className="flex gap-2">
                      {editingOrderId && (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="button"
                        className="flex-1 bg-[#3c5e45] hover:bg-[#2d4a35]"
                        disabled={
                          createOrder.isPending || updateOrder.isPending
                        }
                        onClick={handleSave}
                      >
                        {createOrder.isPending || updateOrder.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                          </>
                        ) : editingOrderId ? (
                          'Save Changes'
                        ) : (
                          'Save Order'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hasRecent && (
              <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white p-4 lg:w-96">
                <h3 className="mb-3 text-lg font-bold text-gray-900">
                  Recent Walk-in Orders
                </h3>
                {historyLoading && (
                  <div className="text-sm text-gray-500">Loading...</div>
                )}
                {!historyLoading && recentOrders.length === 0 && (
                  <div className="text-sm text-gray-400">
                    No walk-in orders yet.
                  </div>
                )}
                <div className="max-h-64 space-y-2 overflow-auto">
                  {recentOrders.map(order => {
                    const paid = order.paymentStatus === 'paid';
                    const label = orderLabel(order);
                    return (
                      <div
                        key={order._id}
                        className="rounded-xl border border-gray-100 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-800">
                            {label}
                          </span>
                          <span
                            className={
                              'rounded-full px-2 py-0.5 text-xs font-semibold ' +
                              (paid
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700')
                            }
                          >
                            {paid ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            ₱{order.totalAmount.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1">
                            {!paid && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-[#3c5e45] border-[#3c5e45]"
                                disabled={markPaid.isPending}
                                onClick={() => setMarkPaidTarget(order)}
                              >
                                <Check className="h-4 w-4" /> Mark as Paid
                              </Button>
                            )}
                            {!paid && (
                              <button
                                type="button"
                                aria-label="Edit order"
                                className="grid h-9 w-9 place-items-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                                onClick={() => loadOrderForEdit(order)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {removeTarget && (
        <div className="fixed inset-0 z-100">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setRemoveTarget(null)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900">Remove item?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to remove{' '}
                <span className="font-bold text-gray-900">
                  {cart.find(c => c.productId === removeTarget)?.name ?? 'this item'}
                </span>{' '}
                from the order?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRemoveTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={confirmRemoveItem}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {markPaidTarget && (
        <div className="fixed inset-0 z-100">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMarkPaidTarget(null)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900">
                Mark as paid?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Mark {orderLabel(markPaidTarget)} (₱
                {markPaidTarget.totalAmount.toLocaleString()}) as paid via{' '}
                {paymentMethodLabel(markPaidTarget.paymentMethod)}?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMarkPaidTarget(null)}
                  disabled={markPaid.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#3c5e45] hover:bg-[#2d4a35]"
                  onClick={confirmMarkPaid}
                  disabled={markPaid.isPending}
                >
                  {markPaid.isPending ? 'Saving...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}