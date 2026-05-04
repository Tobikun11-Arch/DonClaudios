'use client';

import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useProductsQuery,
  useUpdateProductMutation
} from '@/lib/hooks/products/useProducts';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {Plus, Package} from 'lucide-react';
import {type FormEvent, useMemo, useState} from 'react';
import {Button} from '@/components/ui/button';
import {useProductForm} from '../hooks/useProductForm';
import {ProductsHeader} from './ProductsHeader';
import {ProductsFilters} from './ProductsFilters';
import {ProductCard, ProductCardSkeleton} from './ProductCard';
import {ProductFormModal} from './ProductFormModal';
import {DeleteProductModal} from './DeleteProductModal';
import {ImageCropModal} from './ImageCropModal';

export default function ProductsPage() {
  const productsQuery = useProductsQuery();
  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();
  const deleteMutation = useDeleteProductMutation();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Products');
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const {
    form,
    setForm,
    formError,
    setFormError,
    previewUrl,
    isDragging,
    setIsDragging,
    submitStatus,
    setSubmitStatus,
    resetForm,
    loadForm,
    onFileChange,
    onDrop,
    validateAndGetPayload,
    uploadImageIfNeeded
  } = useProductForm();

  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products]
  );

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    return [
      'All Products',
      ...Array.from(set).sort((a, b) => a.localeCompare(b))
    ];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter(p => {
        if (activeCategory !== 'All Products' && p.category !== activeCategory)
          return false;
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
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (p: (typeof products)[number]) => {
    setMode('edit');
    setEditingId(p._id);
    loadForm(p);
    setModalOpen(true);
  };

  const openDeleteModal = (p: (typeof products)[number]) => {
    setDeletingName(p.name);
    setDeletingId(p._id);
    setDeleteModalOpen(true);
  };

  const onCloseModal = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
    e.target.value = '';
  };

  const handleCropDone = (blob: Blob) => {
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);

    const croppedFile = new File([blob], 'product-image.jpg', {
      type: 'image/jpeg'
    });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(croppedFile);

    const fakeEvent = {
      target: {files: dataTransfer.files, value: ''}
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    onFileChange(fakeEvent);
  };

  const handleCropCancel = () => {
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const validated = validateAndGetPayload(mode);
    if (!validated) return;
    const {price, stock} = validated;

    try {
      const imageUrl = await uploadImageIfNeeded();
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

  const onDelete = async () => {
    if (!deletingId) return;
    await deleteMutation.mutateAsync(deletingId);
    setDeleteModalOpen(false);
    setDeletingId(null);
    setDeletingName('');
  };

  return (
    <div className="space-y-5">
      <ProductsHeader
        showButton={visibleProducts.length > 0}
        onAdd={openCreate}
      />

      <ProductsFilters
        query={query}
        onQueryChange={setQuery}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        productCount={cat =>
          cat === 'All Products'
            ? products.length
            : products.filter(p => p.category === cat).length
        }
      />

      {productsQuery.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({length: 3}).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
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
              <ProductCard
                key={p._id}
                product={p}
                onEdit={openEdit}
                onDelete={openDeleteModal}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        ))}

      <ProductFormModal
        open={modalOpen}
        mode={mode}
        form={form}
        formError={formError}
        previewUrl={previewUrl}
        isDragging={isDragging}
        submitStatus={submitStatus}
        isPending={createMutation.isPending || updateMutation.isPending}
        onClose={onCloseModal}
        onSubmit={onSubmit}
        onFormChange={(field, value) => setForm(v => ({...v, [field]: value}))}
        onFileChange={handleFileChange}
        onDrop={onDrop}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
      />

      <DeleteProductModal
        open={deleteModalOpen}
        productName={deletingName}
        isDeleting={deleteMutation.isPending}
        onConfirm={onDelete}
        onClose={() => !deleteMutation.isPending && setDeleteModalOpen(false)}
      />

      {cropSrc && (
        <ImageCropModal
          open={cropOpen}
          src={cropSrc}
          aspect={16 / 9}
          onCropDone={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
