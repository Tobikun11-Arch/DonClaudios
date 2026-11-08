'use client';

import {
  PackagePlus,
  ShoppingCart,
  Settings2,
  Trash2,
  type LucideIcon
} from 'lucide-react';
import {relativeTime, exactDateTime} from '@/lib/utils/relativeTime';
import type {StockMovement} from '@/lib/types/inventory';

const TYPE_INFO: Record<
  StockMovement['type'],
  {label: string; Icon: LucideIcon; iconClass: string; badgeClass: string}
> = {
  restock: {
    label: 'Restocked',
    Icon: PackagePlus,
    iconClass: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10',
    badgeClass: 'text-green-700 dark:text-green-300'
  },
  sold: {
    label: 'Sold',
    Icon: ShoppingCart,
    iconClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10',
    badgeClass: 'text-blue-700 dark:text-blue-300'
  },
  adjustment: {
    label: 'Adjusted',
    Icon: Settings2,
    iconClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
    badgeClass: 'text-amber-700 dark:text-amber-300'
  },
  spoilage: {
    label: 'Spoilage',
    Icon: Trash2,
    iconClass: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
    badgeClass: 'text-red-700 dark:text-red-300'
  }
};

export function movementProductId(m: StockMovement): string {
  return typeof m.productId === 'string' ? m.productId : m.productId?._id ?? '';
}

export function movementProductName(
  m: StockMovement,
  fallback: string
): string {
  if (typeof m.productId === 'object' && m.productId?.name) {
    return m.productId.name;
  }
  return fallback;
}

export function movementPerformedBy(m: StockMovement): string {
  const performer = m.performedBy;
  if (
    performer &&
    typeof performer === 'object' &&
    performer.firstName &&
    performer.lastName
  ) {
    return `${performer.firstName} ${performer.lastName}`;
  }
  return 'System';
}

interface Props {
  movement: StockMovement;
  unit?: string;
  showProduct?: boolean;
  productName?: string;
}

export function ActivityRow({
  movement: m,
  unit: unitLabel = '',
  showProduct = false,
  productName = 'Product'
}: Props) {
  const info = TYPE_INFO[m.type] ?? {
    label: m.type,
    Icon: Settings2,
    iconClass: 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60',
    badgeClass: 'text-gray-700 dark:text-gray-200'
  };

  const Icon = info.Icon;
  const isPositive = m.quantity > 0;
  const unit = unitLabel ? ` ${unitLabel}` : '';

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0">
      <div
        className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${info.iconClass}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {showProduct && (
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {productName}
            </p>
          )}
          <span className={`text-xs font-bold ${info.badgeClass}`}>
            {info.label}
          </span>
        </div>
        <p
          className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
          title={exactDateTime(m.createdAt)}
        >
          {movementPerformedBy(m)} · {relativeTime(m.createdAt)}
        </p>
        {m.note && (
          <p className="text-xs text-gray-400 italic truncate mt-0.5">
            {m.note}
          </p>
        )}
      </div>

      <div className="text-right shrink-0 ml-3">
        <p className={`text-sm font-extrabold ${info.badgeClass}`}>
          {isPositive ? '+' : '−'}
          {Math.abs(m.quantity)}
          {unit}
        </p>
        <p className="text-[11px] text-gray-400">
          {m.previousStock}
          {unit} → {m.newStock}
          {unit}
        </p>
      </div>
    </div>
  );
}