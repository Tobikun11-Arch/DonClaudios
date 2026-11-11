'use client';

import {Check, ChevronDown, Loader2, Plus, Trash2} from 'lucide-react';
import {useState} from 'react';
import {toast} from 'sonner';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {
  useAllergenCatalog,
  useCreateAllergenMutation,
  useDeleteAllergenMutation
} from '@/lib/hooks/useAllergens';
import type {AllergenKind, AllergenOption} from '@/lib/ingredients/allergenCatalog';
import {type ProductAllergen} from '@/lib/types/product';
import {cn} from '@/lib/utils';

interface Props {
  value: ProductAllergen[];
  onChange: (value: ProductAllergen[]) => void;
  disabled?: boolean;
}

/**
 * Pick a product's allergens from the store's allergen list, and grow that
 * list: owners can add their own allergens (saved to the database, shown to
 * customers) and delete the ones they added. Built-ins cannot be deleted.
 */
export function AllergenChecklist({value, onChange, disabled}: Props) {
  const catalog = useAllergenCatalog();
  const createMutation = useCreateAllergenMutation();
  const deleteMutation = useDeleteAllergenMutation();

  const [open, setOpen] = useState(value.length > 0);
  const [newLabel, setNewLabel] = useState('');
  const [newKind, setNewKind] = useState<AllergenKind>('allergen');
  const [confirmDelete, setConfirmDelete] = useState<AllergenOption | null>(null);

  const toggle = (allergen: ProductAllergen) => {
    onChange(value.includes(allergen) ? value.filter(a => a !== allergen) : [...value, allergen]);
  };

  const addAllergen = async () => {
    const label = newLabel.trim();
    if (label.length < 2) {
      toast.error('Allergen name needs at least 2 characters.');
      return;
    }
    try {
      const created = await createMutation.mutateAsync({label, kind: newKind});
      // Adding it here means "this product has it", so tick it straight away.
      onChange([...value, created.key]);
      setNewLabel('');
      setNewKind('allergen');
      toast.success(`Added "${created.label}" to the allergen list.`);
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Could not add the allergen.'));
    }
  };

  const removeAllergen = async (option: AllergenOption) => {
    if (!option.id) return;
    try {
      const result = await deleteMutation.mutateAsync(option.id);
      onChange(value.filter(a => a !== option.key));
      setConfirmDelete(null);
      toast.success(
        result.productsUpdated > 0
          ? `Deleted "${option.label}" and removed it from ${result.productsUpdated} product${result.productsUpdated === 1 ? '' : 's'}.`
          : `Deleted "${option.label}".`
      );
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Could not delete the allergen.'));
    }
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600"
        >
          <Plus className="h-4 w-4" />
          Add allergen
        </button>
        {value.map(allergen => (
          <span
            key={allergen}
            className="inline-flex items-center gap-1 rounded-full bg-[#e9f5ee] px-3 py-1.5 text-sm text-[#1c2f24] dark:bg-[#7ed4a0]/10 dark:text-gray-100"
          >
            <Check className="h-3.5 w-3.5 text-[#2d4a35] dark:text-[#7ed4a0]" />
            {catalog.label(allergen)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {catalog.options.map(option => {
          const active = value.includes(option.key);
          return (
            <span
              key={option.key}
              className={cn(
                'inline-flex items-center rounded-lg border text-sm transition-colors',
                active
                  ? 'border-[#2d4a35] bg-[#e9f5ee] text-[#1c2f24] dark:border-[#7ed4a0]/60 dark:bg-[#7ed4a0]/10 dark:text-gray-100'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600'
              )}
            >
              <label className="inline-flex cursor-pointer items-center gap-2 py-2 pl-3 pr-3">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(option.key)}
                  disabled={disabled}
                  className="accent-[#2d4a35]"
                />
                {option.label}
                {option.kind === 'dietary' && (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">note</span>
                )}
              </label>
              {!option.builtIn && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(option)}
                  disabled={disabled || deleteMutation.isPending}
                  aria-label={`Delete ${option.label} from the allergen list`}
                  title="Delete from the allergen list"
                  className="-ml-1 mr-1 grid h-7 w-7 place-items-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          );
        })}
      </div>

      {confirmDelete && (
        <div
          role="alertdialog"
          aria-label={`Delete ${confirmDelete.label}`}
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-500/30 dark:bg-red-500/10"
        >
          <p className="font-semibold text-red-700 dark:text-red-300">
            Delete &quot;{confirmDelete.label}&quot; from the allergen list?
          </p>
          <p className="mt-0.5 text-red-700/80 dark:text-red-300/80">
            It is also removed from every product that has it. This cannot be undone.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => removeAllergen(confirmDelete)}
              disabled={deleteMutation.isPending}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              disabled={deleteMutation.isPending}
              className="min-h-[36px] rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-gray-300 p-3 dark:border-gray-600">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Not on the list? Add a new allergen</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => {
              // Enter would submit the whole product form.
              if (e.key === 'Enter') {
                e.preventDefault();
                void addAllergen();
              }
            }}
            maxLength={30}
            placeholder="e.g. Mushroom, Coconut, MSG"
            aria-label="New allergen name"
            disabled={disabled || createMutation.isPending}
            className="min-h-[40px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#2d4a35] focus:ring-2 focus:ring-[#2d4a35]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <select
            value={newKind}
            onChange={e => setNewKind(e.target.value as AllergenKind)}
            aria-label="Type of allergen"
            disabled={disabled || createMutation.isPending}
            className="min-h-[40px] rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="allergen">Allergen (red warning)</option>
            <option value="dietary">Dietary note (grey)</option>
          </select>
          <button
            type="button"
            onClick={() => void addAllergen()}
            disabled={disabled || createMutation.isPending || newLabel.trim().length < 2}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#2d4a35] px-4 text-sm font-semibold text-white hover:bg-[#24402c] disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
          New allergens are saved for every product and shown to customers on the menu.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen(false)}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ChevronDown className="h-3.5 w-3.5 rotate-180 transition-transform" />
        Done
      </button>
    </div>
  );
}
