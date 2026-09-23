'use client';

import {Check, Loader2, Plus, Search, X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {
  ingredientIconByKey,
  matchIngredientIcon
} from '@/lib/ingredients/ingredientIcons';
import {type IngredientItem} from '@/lib/types/ingredient';
import {type ProductIngredient} from '@/lib/types/product';

interface Props {
  ingredients: ProductIngredient[];
  onChange: (value: ProductIngredient[]) => void;
  library: IngredientItem[];
  isLibraryLoading?: boolean;
  onAddToLibrary?: (name: string) => Promise<IngredientItem | null>;
  disabled?: boolean;
}

const MAX_SUGGESTIONS = 20;

export function IngredientChipsInput({
  ingredients,
  onChange,
  library,
  isLibraryLoading = false,
  onAddToLibrary,
  disabled
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const chosenNames = new Set(ingredients.map(i => i.name.toLowerCase()));
  const available = library.filter(
    item => item.status === 'active' && !chosenNames.has(item.name.toLowerCase())
  );

  const q = query.trim().toLowerCase();
  const matches = available.filter(item =>
    item.name.toLowerCase().includes(q)
  );
  const suggestions = matches.slice(0, MAX_SUGGESTIONS);
  const canAddNew =
    q.length > 0 && suggestions.length === 0 && Boolean(onAddToLibrary);
  const rowCount = suggestions.length + (canAddNew ? 1 : 0);
  const activeIndex = rowCount === 0 ? 0 : Math.min(highlight, rowCount - 1);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const {Icon: LiveIcon} = matchIngredientIcon(query);

  const addItem = (item: IngredientItem) => {
    if (disabled) return;
    onChange([...ingredients, {name: item.name, iconKey: item.iconKey}]);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleAddNew = async () => {
    if (disabled || !onAddToLibrary || !q) return;
    const item = await onAddToLibrary(query.trim());
    if (item) {
      addItem(item);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => (h + 1) % Math.max(1, rowCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => (h - 1 + Math.max(1, rowCount)) % Math.max(1, rowCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (canAddNew && activeIndex === suggestions.length) {
        void handleAddNew();
      } else if (suggestions[activeIndex]) {
        addItem(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const onInputChange = (value: string) => {
    setQuery(value);
    setOpen(true);
  };

  const renderHighlighted = (name: string) => {
    if (!q) return name;
    const index = name.toLowerCase().indexOf(q);
    if (index === -1) return name;
    return (
      <>
        {name.slice(0, index)}
        <strong className="font-bold">{name.slice(index, index + q.length)}</strong>
        {name.slice(index + q.length)}
      </>
    );
  };

  return (
    <div className="space-y-2" ref={rootRef}>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-0.5 transition-colors focus-within:border-[#2d4a35] focus-within:ring-2 focus-within:ring-[#3c5e45]/20 overflow-hidden relative">
        {query.trim() ? (
          <LiveIcon className="h-4 w-4 text-gray-500 shrink-0" />
        ) : (
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={e => onInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Search ingredient library (e.g. Garlic)"
          disabled={disabled || isLibraryLoading}
          className="flex-1 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
        {isLibraryLoading ? (
          <Loader2 className="h-4 w-4 text-gray-400 animate-spin shrink-0" />
        ) : null}
        {query.trim() ? (
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              setQuery('');
              setOpen(true);
            }}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open && (
        <div className="relative z-20">
          <div className="absolute inset-x-0 top-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {suggestions.length === 0 && !canAddNew ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                {isLibraryLoading
                  ? 'Loading ingredient library...'
                  : q
                  ? `No ingredient named "${query.trim()}" in the library yet.`
                  : 'No matching ingredients.'}
              </div>
            ) : (
              <>
                {suggestions.map((item, index) => {
                  const Icon = ingredientIconByKey(item.iconKey);
                  return (
                    <button
                      key={item._id}
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => addItem(item)}
                      onMouseEnter={() => setHighlight(index)}
                      className={
                        'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors' +
                        (index === activeIndex
                          ? ' bg-[#e9f5ee]'
                          : ' hover:bg-gray-50')
                      }
                    >
                      <Icon className="h-4 w-4 text-gray-600 shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-gray-800">
                        {renderHighlighted(item.name)}
                      </span>
                      {index === activeIndex ? (
                        <Check className="h-4 w-4 text-[#2d4a35] shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
                {canAddNew ? (
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => void handleAddNew()}
                    onMouseEnter={() => setHighlight(suggestions.length)}
                    className={
                      'flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-left text-sm transition-colors' +
                      (activeIndex === suggestions.length
                        ? ' bg-[#e9f5ee]'
                        : ' hover:bg-gray-50')
                    }
                  >
                    <Plus className="h-4 w-4 text-[#2d4a35] shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-[#2d4a35]">
                      Add &quot;{query.trim()}&quot; as new ingredient
                    </span>
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ingredients.map((ingredient, index) => {
            const ChipIcon = ingredientIconByKey(ingredient.iconKey);
            const isFallback = ingredient.iconKey === 'other';
            return (
              <span
                key={`${ingredient.name}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#e9f5ee] text-[#1c2f24] px-3 py-1.5 text-sm"
              >
                <ChipIcon className="h-4 w-4 shrink-0" />
                {ingredient.name}
                {isFallback ? (
                  <span
                    title="Pending icon assignment"
                    className="ml-0.5 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-700"
                  >
                    pending icon
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    onChange(ingredients.filter((_, i) => i !== index))
                  }
                  disabled={disabled}
                  className="text-gray-500 hover:text-red-600 ml-0.5"
                  aria-label={`Remove ${ingredient.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}