'use client';

import {
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  type LucideIcon
} from 'lucide-react';
import {cn} from '@/lib/utils';

interface CardProps {
  icon: LucideIcon;
  iconTile: string;
  label: string;
  value: string;
  helper: string;
  alert?: boolean;
  alertClass?: string;
}

function SummaryCard({
  icon: Icon,
  iconTile,
  label,
  value,
  helper,
  alert = false,
  alertClass
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-white p-4 flex items-center gap-3',
        alert ? alertClass : 'border-gray-100'
      )}
    >
      <div
        className={cn(
          'w-11 h-11 rounded-xl shrink-0 flex items-center justify-center',
          iconTile
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium leading-none">
          {label}
        </p>
        <p className="text-2xl font-extrabold text-gray-900 leading-tight mt-1">
          {value}
        </p>
        <p className="text-xs text-gray-400 leading-none mt-1.5 truncate">
          {helper}
        </p>
      </div>
    </div>
  );
}

interface Props {
  total: number;
  lowStock: number;
  outOfStock: number;
  onMenu: number;
}

export function InventorySummaryCards({
  total,
  lowStock,
  outOfStock,
  onMenu
}: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        icon={Package}
        iconTile="bg-[#e9f5ee] text-[#2d4a35]"
        label="Total Items"
        value={String(total)}
        helper="Items in inventory"
      />

      <SummaryCard
        icon={AlertTriangle}
        iconTile={
          lowStock > 0 ? 'bg-amber-50 text-amber-500' : 'bg-[#e9f5ee] text-[#2d4a35]'
        }
        label="Low Stock"
        value={String(lowStock)}
        helper={lowStock > 0 ? 'Needs restocking soon' : 'All good'}
        alert={lowStock > 0}
        alertClass={
          lowStock > 0
            ? 'border-amber-200 bg-amber-50/40'
            : 'border-gray-100'
        }
      />

      <SummaryCard
        icon={XCircle}
        iconTile={
          outOfStock > 0 ? 'bg-red-50 text-red-500' : 'bg-[#e9f5ee] text-[#2d4a35]'
        }
        label="Out of Stock"
        value={String(outOfStock)}
        helper={outOfStock > 0 ? 'Cannot be ordered' : 'All good'}
        alert={outOfStock > 0}
        alertClass={
          outOfStock > 0 ? 'border-red-200 bg-red-50/40' : 'border-gray-100'
        }
      />

      <SummaryCard
        icon={CheckCircle2}
        iconTile="bg-[#e9f5ee] text-[#2d4a35]"
        label="On the Menu"
        value={`${onMenu} of ${total}`}
        helper="Live on menu"
      />
    </div>
  );
}