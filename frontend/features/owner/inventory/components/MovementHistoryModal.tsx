'use client';

import {useMovementsQuery} from '@/lib/hooks/inventory/useInventory';
import {Package, History, Loader2} from 'lucide-react';
import type {StockMovement} from '@/lib/types/inventory';

interface Props {
  open: boolean;
  productId: string;
  productName: string;
  onClose: () => void;
}

const typeLabels: Record<string, {label: string; color: string}> = {
  restock: {label: 'Restocked', color: 'text-green-600'},
  sold: {label: 'Sold', color: 'text-blue-600'},
  adjustment: {label: 'Adjustment', color: 'text-amber-600'},
  spoilage: {label: 'Spoilage', color: 'text-red-600'}
};

function MovementRow({m}: {m: StockMovement}) {
  const performer =
    typeof m.performedBy === 'object'
      ? `${m.performedBy.firstName} ${m.performedBy.lastName}`
      : 'System';

  const date = new Date(m.createdAt).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const typeInfo = typeLabels[m.type] ?? {
    label: m.type,
    color: 'text-gray-600'
  };

  const qtyChange = m.quantity > 0 ? `+${m.quantity}` : `${m.quantity}`;
  const qtyColor = m.quantity > 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold ${typeInfo.color}`}
          >
            {typeInfo.label}
          </span>
          {m.note && (
            <span className="text-xs text-gray-400 truncate">— {m.note}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {performer} · {date}
        </p>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className={`text-sm font-extrabold ${qtyColor}`}>{qtyChange}</p>
        <p className="text-[11px] text-gray-400">
          {m.previousStock} → {m.newStock}
        </p>
      </div>
    </div>
  );
}

export function MovementHistoryModal({
  open,
  productId,
  productName,
  onClose
}: Props) {
  const {data, isLoading, isError} = useMovementsQuery(productId);

  if (!open) return null;

  const movements = data?.movements ?? [];

  return (
    <div className="fixed inset-0 z-100">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <div className="w-full sm:max-w-lg bg-white shadow-xl border border-gray-100 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[80vh]">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Stock Movement History
              </p>
              <p className="text-xs text-gray-500">{productName}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {isLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}

            {isError && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
                Failed to load movement history.
              </div>
            )}

            {!isLoading && !isError && movements.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                  <Package className="h-5 w-5 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  No movements yet
                </p>
                <p className="text-xs text-gray-400">
                  Stock changes will appear here.
                </p>
              </div>
            )}

            {!isLoading &&
              !isError &&
              movements.length > 0 &&
              movements.map(m => <MovementRow key={m._id} m={m} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
