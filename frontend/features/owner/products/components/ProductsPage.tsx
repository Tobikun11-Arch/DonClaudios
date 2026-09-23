'use client';

import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useProductsQuery,
  useUpdateProductMutation
} from '@/lib/hooks/products/useProducts';
import {
  useCreateIngredientMutation,
  useDeleteIngredientMutation,
  useIngredientsQuery,
  useUpdateIngredientMutation
} from '@/lib/hooks/ingredients/useIngredients';
import {useCategoriesQuery} from '@/lib/hooks/categories/useCategories';
import {matchIngredientIcon} from '@/lib/ingredients/ingredientIcons';
import {type IngredientItem} from '@/lib/types/ingredient';
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
import {IngredientLibraryBanner} from './IngredientLibraryBanner';

export default function ProductsPage() {
  const productsQuery = useProductsQuery();
  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();
  const deleteMutation = useDeleteProductMutation();
  const ingredientsQuery = useIngredientsQuery();
  const createIngredientMutation = useCreateIngredientMutation();
  const updateIngredientMutation = useUpdateIngredientMutation();
  const deleteIngredientMutation = useDeleteIngredientMutation();
  const categoriesQuery = useCategoriesQuery();

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

  const menuCategories = useMemo(
    () => categoriesQuery.data?.categories ?? [],
    [categoriesQuery.data?.categories]
  );

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
  } = useProductForm(menuCategories);

  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products]
  );

  const legacyCategoryProducts = useMemo(
    () =>
      products.filter(
        p =>
          !menuCategories.some(
            c => c.name.trim().toLowerCase() === p.category.trim().toLowerCase()
          )
      ),
    [menuCategories, products]
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

  const ingredientLibrary = useMemo(
    () => ingredientsQuery.data?.ingredients ?? [],
    [ingredientsQuery.data?.ingredients]
  );

  const pendingIngredients = useMemo(
    () => ingredientLibrary.filter(item => item.status === 'pending'),
    [ingredientLibrary]
  );

  const onAddIngredientToLibrary = async (
    name: string
  ): Promise<IngredientItem | null> => {
    const {iconKey} = matchIngredientIcon(name);
    try {
      const {ingredient} = await createIngredientMutation.mutateAsync({
        name: name.trim(),
        iconKey,
        status: iconKey === 'other' ? 'pending' : 'active'
      });
      return ingredient;
    } catch {
      return {name: name.trim(), iconKey} as IngredientItem;
    }
  };

  const onApproveIngredient = async (
    item: IngredientItem,
    iconKey: string
  ) => {
    await updateIngredientMutation.mutateAsync({
      id: item._id,
      body: {iconKey, status: 'active'}
    });
  };

  const onDeleteSuggestion = async (item: IngredientItem) => {
    await deleteIngredientMutation.mutateAsync(item._id);
  };

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
          ingredients: validated.isBulkCategory ? [] : validated.ingredients,
          allergens: validated.isBulkCategory ? [] : validated.allergens,
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
            ingredients: validated.isBulkCategory ? [] : validated.ingredients,
            allergens: validated.isBulkCategory ? [] : validated.allergens,
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

      {!categoriesQuery.isLoading && legacyCategoryProducts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            {legacyCategoryProducts.length}{' '}
            {legacyCategoryProducts.length === 1
              ? 'product uses a legacy category'
              : 'products use legacy categories'}{' '}
            not in your category list.
          </p>
          <p className="text-xs text-amber-800 mt-1">
            Open each product below and pick a category from the list (e.g.{' '}
            {legacyCategoryProducts
              .map(p => `"${p.category}"`)
              .slice(0, 3)
              .join(', ')}
            ) so stock units and tagging rules keep working. Old categories can
            be added or renamed in Settings &gt; Menu Categories.
          </p>
        </div>
      )}

      <IngredientLibraryBanner
        pending={pendingIngredients}
        busyId={updateIngredientMutation.isPending ? updateIngredientMutation.variables?.id : null}
        isDeletingId={deleteIngredientMutation.isPending ? deleteIngredientMutation.variables : null}
        onApprove={onApproveIngredient}
        onDelete={onDeleteSuggestion}
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
        categories={menuCategories}
        categoriesLoading={categoriesQuery.isLoading}
        ingredientLibrary={ingredientLibrary}
        ingredientLibraryLoading={ingredientsQuery.isLoading}
        onAddIngredientToLibrary={onAddIngredientToLibrary}
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
