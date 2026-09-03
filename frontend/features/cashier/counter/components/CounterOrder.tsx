'use client';

import {useMemo, useState} from 'react';
import Image from 'next/image';
import {Minus, Plus, Search, Trash2, ShoppingCart, RotateCcw} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import {
  useCounterOrdersQuery,
  useCreateCounterOrderMutation,
  useVoidCounterOrderMutation
} from '@/lib/hooks/orders/useCashierCounterOrder';

type CartLine = {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  qty: number;
  maxQty: number;
};

const PAYMENT_METHODS = [
  {value: 'cash', label: 'Cash'},
  {value: 'card', label: 'Card'},
  {value: 'gcash', label: 'GCash'},
  {value: 'other', label: 'Other'}
] as const;

export default function CounterOrder() {
  const {data: productsData, isLoading} = useProductsQuery();
  const products = useMemo(
    () => productsData?.products ?? [],
    [productsData?.products]
  );
  const availableProducts = useMemo(
    () => products.filter(p => p.isAvailable && p.stock > 0),
    [products]
  );

  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]['value']>('cash');
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
  }>({});

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
  const total = useMemo(
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

  const changeQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(c => {
          if (c.productId !== productId) return c;
          const next = c.qty + delta;
          if (next < 1) return null;
          if (next > c.maxQty) {
            toast.warning(`Only ${c.maxQty} left in stock`);
            return c;
          }
          return {...c, qty: next};
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const removeLine = (productId: string) => {
    setCart(prev => prev.filter(c => c.productId !== productId));
  };

  const createOrder = useCreateCounterOrderMutation();
  const voidOrder = useVoidCounterOrderMutation();
  const {data: historyData, isLoading: historyLoading} = useCounterOrdersQuery();
  const history = useMemo(() => historyData?.orders ?? [], [historyData]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    const nextErrors: typeof errors = {};
    if (!firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await createOrder.mutateAsync({
        customerInfo: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim() ? phoneNumber.trim() : undefined,
          email: email.trim() ? email.trim() : undefined
        },
        items: cart.map(c => ({
          productId: c.productId,
          quantity: c.qty,
          price: c.price
        })),
        totalAmount: total,
        paymentMethod
      });
      toast.success('Order placed successfully');
      setCart([]);
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setEmail('');
      setErrors({});
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to place order'
      );
    }
  };

  const handleVoid = async (orderId: string) => {
    try {
      await voidOrder.mutateAsync(orderId);
      toast.success('Order voided and stock restored');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to void order'
      );
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6 lg:flex-row">
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Counter Menu</h2>
            <p className="text-sm text-gray-500">
              Select items to add to the customer&apos;s order
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

        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ' +
              (!activeCategory
                ? 'bg-[#c30010] text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50')
            }
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={
                'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ' +
                (activeCategory === category
                  ? 'bg-[#c30010] text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50')
              }
            >
              {category}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="text-sm text-gray-500">Loading products...</div>
        )}

        {!isLoading && visibleProducts.length === 0 && (
          <div className="text-sm text-gray-500">
            No products available in this category.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
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
                  className="mt-2 w-full bg-[#3c5e45] hover:bg-[#2d4a35]"
                  onClick={() => addToCart(product)}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 lg:w-96">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <ShoppingCart className="h-5 w-5 text-[#c30010]" />
              Current Order
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {line.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      ₱{line.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeQty(line.productId, -1)}
                      className="rounded-md border border-gray-200 p-1 text-gray-600 hover:bg-gray-50"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQty(line.productId, 1)}
                      className="rounded-md border border-gray-200 p-1 text-gray-600 hover:bg-gray-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLine(line.productId)}
                      className="ml-1 rounded-md p-1 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-xl font-bold text-gray-900">
              ₱{total.toLocaleString()}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-medium">First name *</Label>
                  <Input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Juan"
                    className="mt-1"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-medium">Last name *</Label>
                  <Input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Dela Cruz"
                    className="mt-1"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">Phone</Label>
                <Input
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="09xxxxxxxxx"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Email (receipt)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="s...@email.com"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Payment method</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={
                      'rounded-full px-3 py-1.5 text-sm font-medium transition-colors ' +
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

            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={createOrder.isPending}
              onClick={handlePlaceOrder}
            >
              {createOrder.isPending ? 'Placing order...' : 'Place Order'}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white p-4 lg:w-96">
          <h3 className="mb-3 text-lg font-bold text-gray-900">
            Recent Counter Orders
          </h3>
          {historyLoading && (
            <div className="text-sm text-gray-500">Loading...</div>
          )}
          {!historyLoading && history.length === 0 && (
            <div className="text-sm text-gray-400">No counter orders yet.</div>
          )}
          <div className="max-h-64 space-y-2 overflow-auto">
            {history.map(order => (
              <div
                key={order._id}
                className="rounded-xl border border-gray-100 p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">
                    #{String(order._id).slice(-6).toUpperCase()}
                  </p>
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-xs font-semibold ' +
                      (order.orderStatus === 'cancelled'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-700')
                    }
                  >
                    {order.orderStatus === 'cancelled' ? 'Voided' : 'Completed'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {order.guestInfo?.firstName} {order.guestInfo?.lastName}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">
                    ₱{order.totalAmount.toLocaleString()}
                  </span>
                  {order.orderStatus !== 'cancelled' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      disabled={voidOrder.isPending}
                      onClick={() => handleVoid(order._id)}
                    >
                      <RotateCcw className="h-4 w-4" /> Void
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
