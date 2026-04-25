'use client';

import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useProductsQuery,
  useUpdateProductMutation
} from '@/lib/hooks/products/useProducts';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {uploadProductImage} from '@/lib/api/uploadApi';
import {emptyProductForm, type ProductFormState} from '@/lib/types/products';
import {cn} from '@/lib/utils';
import {Plus, Search, Pencil, Trash2, Package, Upload} from 'lucide-react';
import Image from 'next/image';
import {
  type DragEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from 'react';

function formatPeso(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(value);
}

function Modal({
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
    <div className="fixed inset-0 z-100">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">
                  Fill out the details then save.
                </p>
              </div>
            </div>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const productsQuery = useProductsQuery();
  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();
  const deleteMutation = useDeleteProductMutation();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All Products');

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'uploading' | 'submitting'
  >('idle');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return [
      'All Products',
      ...Array.from(set).sort((a, b) => a.localeCompare(b))
    ];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter(p => {
        if (
          activeCategory !== 'All Products' &&
          p.category !== activeCategory
        ) {
          return false;
        }
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const av = a.isAvailable ? 0 : 1;
        const bv = b.isAvailable ? 0 : 1;
        if (av !== bv) return av - bv;
        return a.name.localeCompare(b.name);
      });
  }, [activeCategory, products, query]);

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setForm(emptyProductForm);
    setFormError(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setModalOpen(true);
  };

  const openEdit = (p: (typeof products)[number]) => {
    setMode('edit');
    setEditingId(p._id);
    setForm({
      name: p.name ?? '',
      category: p.category ?? '',
      price: String(p.price ?? ''),
      stock: String(p.stock ?? ''),
      description: p.description ?? '',
      imageUrl: p.imageUrl ?? '',
      isAvailable: !!p.isAvailable
    });
    setFormError(null);
    setSelectedFile(null);
    setPreviewUrl(p.imageUrl ?? null);
    setModalOpen(true);
  };

  const handleIncomingFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image must be under 5MB.');
      return;
    }

    setFormError(null);
    setSelectedFile(file);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleIncomingFile(file);
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleIncomingFile(file);
  };

  const onCloseModal = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setModalOpen(false);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim()) return setFormError('Name is required');
    if (!form.category.trim()) return setFormError('Category is required');
    if (Number.isNaN(price) || price < 0)
      return setFormError('Price is invalid');
    if (!Number.isInteger(stock) || stock < 0)
      return setFormError('Stock is invalid');

    if (mode === 'create' && !selectedFile) {
      return setFormError('Please select a product image before saving.');
    }

    try {
      let imageUrl = form.imageUrl.trim() || undefined;
      if (selectedFile) {
        setSubmitStatus('uploading');
        const uploaded = await uploadProductImage(selectedFile);
        imageUrl = uploaded.imageUrl;
      }

      setSubmitStatus('submitting');
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: form.name.trim(),
          category: form.category.trim(),
          price,
          stock,
          description: form.description.trim() || undefined,
          imageUrl,
          isAvailable: form.isAvailable
        });
      } else {
        if (!editingId) return;
        await updateMutation.mutateAsync({
          id: editingId,
          body: {
            name: form.name.trim(),
            category: form.category.trim(),
            price,
            stock,
            description: form.description.trim() || undefined,
            imageUrl,
            isAvailable: form.isAvailable
          }
        });
      }

      setModalOpen(false);
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err, 'Failed to save product'));
    } finally {
      setSubmitStatus('idle');
    }
  };

  const onDelete = async (id: string) => {
    const ok = window.confirm('Delete this product? This cannot be undone.');
    if (!ok) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2d4a35]">
            Products Management
          </h1>
          <p className="text-sm text-gray-500">
            Manage your menu items and categories.
          </p>
        </div>

        {visibleProducts.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              onClick={openCreate}
              className="bg-[#2d4a35] hover:bg-[#24402c]"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products"
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
          {categories.map(cat => {
            const active = cat === activeCategory;
            const count =
              cat === 'All Products'
                ? products.length
                : products.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors border',
                  active
                    ? 'bg-[#2d4a35] text-white border-[#2d4a35]'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                )}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {productsQuery.isLoading && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 text-sm text-gray-600">
          Loading products…
        </div>
      )}

      {productsQuery.isError && (
        <div className="bg-white border border-red-200 rounded-2xl p-6 text-sm text-red-700">
          {getFriendlyErrorMessage(
            productsQuery.error,
            'Failed to load products'
          )}
        </div>
      )}

      {!productsQuery.isLoading &&
        !productsQuery.isError &&
        (visibleProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#e9f5ee] flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-[#2d4a35]" />
            </div>

            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              No products yet
            </h3>

            <p className="text-sm text-gray-400 max-w-xs mb-6">
              Add your first product so it shows up on your menu.
            </p>

            <Button
              onClick={openCreate}
              className="bg-[#2d4a35] hover:bg-[#24402c] text-white text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleProducts.map(p => (
              <Card key={p._id} className="overflow-hidden border-gray-100">
                <div className="relative h-40 bg-gray-50">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt={p.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 25vw"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-300">
                      <Package className="h-10 w-10" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3">
                    <span
                      className={cn(
                        'text-[11px] font-bold px-3 py-1 rounded-full border',
                        p.isAvailable
                          ? 'bg-[#e9f5ee] text-[#2d4a35] border-[#c9e7d4]'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      )}
                    >
                      {p.isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}
                    </span>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {p.category}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-gray-900">
                        {formatPeso(p.price)}
                      </p>
                      <p className="text-xs text-gray-500">Stock: {p.stock}</p>
                    </div>
                  </div>

                  {p.description ? (
                    <p className="mt-2 text-xs text-gray-500 line-clamp-2 min-h-8">
                      {p.description}
                    </p>
                  ) : (
                    <div className="mt-2 min-h-8" />
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(p)}
                      className="flex-1"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(p._id)}
                      disabled={deleteMutation.isPending}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

      <Modal
        open={modalOpen}
        title={mode === 'create' ? 'Add Product' : 'Edit Product'}
        onClose={onCloseModal}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col items-center">
            <input
              id="productImage"
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
              disabled={
                submitStatus !== 'idle' ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            />
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('productImage');
                if (el instanceof HTMLInputElement) el.click();
              }}
              onDragOver={e => e.preventDefault()}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={cn(
                'mt-2 w-full max-w-md aspect-square rounded-2xl border-2 border-dashed transition-colors overflow-hidden bg-white',
                isDragging
                  ? 'border-[#2d4a35] bg-[#e9f5ee]'
                  : 'border-[#c9e7d4] hover:border-[#2d4a35]'
              )}
              disabled={
                submitStatus !== 'idle' ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {previewUrl ? (
                <div className="relative w-full h-full">
                  <Image
                    src={previewUrl}
                    alt="Product image preview"
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="512px"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/45 text-white text-xs px-3 py-2">
                    Click to replace or drag and drop
                  </div>
                </div>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-[#2d4a35]">
                  <div className="w-14 h-14 rounded-2xl bg-[#e9f5ee] flex items-center justify-center">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-extrabold">
                      Upload product image
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Click to choose or drag and drop here
                    </p>
                  </div>
                </div>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => setForm(v => ({...v, name: e.target.value}))}
                placeholder="e.g. Lechon Belly 1kg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={form.category}
                onChange={e => setForm(v => ({...v, category: e.target.value}))}
                placeholder="e.g. Lechon"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                inputMode="decimal"
                value={form.price}
                onChange={e => setForm(v => ({...v, price: e.target.value}))}
                placeholder="e.g. 4500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                inputMode="numeric"
                value={form.stock}
                onChange={e => setForm(v => ({...v, stock: e.target.value}))}
                placeholder="e.g. 10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={form.description}
              onChange={e =>
                setForm(v => ({...v, description: e.target.value}))
              }
              placeholder="Short description"
            />
          </div>

          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onCloseModal}
              disabled={
                submitStatus !== 'idle' ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#2d4a35] hover:bg-[#24402c]"
              disabled={
                submitStatus !== 'idle' ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {submitStatus === 'uploading'
                ? 'Uploading image…'
                : submitStatus === 'submitting'
                  ? 'Saving…'
                  : mode === 'create'
                    ? 'Save Product'
                    : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
