'use client';

import {AlertTriangle, Check, ChevronDown, Loader2, Trash2} from 'lucide-react';
import {createElement, useState} from 'react';
import {
  ingredientIconByKey,
  INGREDIENT_ICON_OPTIONS
} from '@/lib/ingredients/ingredientIcons';
import {type IngredientItem} from '@/lib/types/ingredient';
import {cn} from '@/lib/utils';

interface Props {
  pending: IngredientItem[];
  busyId?: string | null;
  isDeletingId?: string | null;
  onApprove: (item: IngredientItem, iconKey: string) => void;
  onDelete: (item: IngredientItem) => void;
}

export function IngredientLibraryBanner({
  pending,
  busyId,
  isDeletingId,
  onApprove,
  onDelete
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [iconPicks, setIconPicks] = useState<Record<string, string>>({});

  if (pending.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            {pending.length} ingredient suggestion
            {pending.length === 1 ? '' : 's'} pending
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-amber-600 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-amber-200 px-4 py-3 space-y-2">
          {pending.map(item => {
            const Icon = ingredientIconByKey(item.iconKey);
            const pick = iconPicks[item._id] ?? item.iconKey;
            const busy =
              busyId === item._id || isDeletingId === item._id;
            return (
              <div
                key={item._id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-white border border-amber-100 px-3 py-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className="h-4 w-4 text-gray-600 shrink-0" />
                  <span className="text-sm text-gray-800 truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 shrink-0">
                    icon: {item.iconKey}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1">
                    <PickIcon
                      className="h-4 w-4 text-gray-600"
                      iconKey={pick}
                    />
                    <select
                      value={pick}
                      disabled={busy}
                      onChange={e => {
                        setIconPicks(prev => ({
                          ...prev,
                          [item._id]: e.target.value
                        }));
                      }}
                      className="bg-transparent text-xs text-gray-700 focus:outline-none"
                      aria-label={`Icon for ${item.name}`}
                    >
                      {INGREDIENT_ICON_OPTIONS.map(option => (
                        <option key={option.key} value={option.key}>
                          {option.key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onApprove(item, pick)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2d4a35] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#24402c] disabled:opacity-50"
                  >
                    {busyId === item._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                  >
                    {isDeletingId === item._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-amber-700">
            Set the correct icon for each suggestion, then Approve to add it to
            the ingredient library.
          </p>
        </div>
      )}
    </div>
  );
}

function PickIcon({iconKey, className}: {iconKey: string; className?: string}) {
  return createElement(ingredientIconByKey(iconKey), {className});
}