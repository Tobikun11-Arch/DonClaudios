import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {stockUnitLabel} from '@/lib/categories/categoryUtils';
import {cn} from '@/lib/utils';
import {Package, Pencil, Trash2, Clock, CalendarClock} from 'lucide-react';
import Image from 'next/image';
import {formatPeso} from '../utils/formatPeso';
import {Product} from '@/lib/types/product';
import {
  formatBatchTime,
  getPreOrderState,
  isPreOrderProduct,
  preOrderDisplay,
  preOrderLimitLabel
} from '@/lib/preOrder/preOrder';

interface Props {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  isDeleting: boolean;
}

export function ProductCard({product: p, onEdit, onDelete, isDeleting}: Props) {
  const po = preOrderDisplay(p);
  const poState = getPreOrderState(p);

  return (
    <Card className="flex h-full flex-col overflow-hidden border-gray-100 dark:border-gray-700 p-0">
      <div className="relative aspect-[4/3] bg-gray-50 dark:bg-gray-800/60">
        {p.imageUrl ? (
          <Image
            src={p.imageUrl}
            alt={p.name}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, 25vw"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-300">
            <Package className="h-10 w-10" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1">
          <span
            className={cn(
              'text-[11px] font-bold px-3 py-1 rounded-full border',
              p.isAvailable
                ? 'bg-[#e9f5ee] dark:bg-gray-950/85 text-[#2d4a35] dark:text-[#7ed4a0] border-[#c9e7d4] dark:border-[#7ed4a0]/30'
                : 'bg-gray-100 dark:bg-gray-950/85 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            )}
          >
            {p.isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-gray-950/85 text-amber-700 dark:text-amber-300">
            <Clock size={11} />
            {p.prepTimeMinutes != null ? `~${p.prepTimeMinutes} min` : 'No time set'}
          </span>
          {p.preOrderOnly && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-gray-950/85 text-purple-700 dark:text-purple-300">
              <CalendarClock size={11} />
              PRE-ORDER ONLY
            </span>
          )}
          {!p.preOrderOnly && isPreOrderProduct(p) && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-gray-950/85 text-purple-700 dark:text-purple-300">
              <CalendarClock size={11} />
              PRE-ORDER
              {po.closed && (
                <span className="font-semibold text-purple-500">· CLOSED</span>
              )}
            </span>
          )}
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.category}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
              {formatPeso(p.price)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Stock: {p.stock}{p.stockUnit ? ` ${stockUnitLabel(p.stockUnit)}` : ''}</p>
          </div>
        </div>

        {isPreOrderProduct(p) ? (
          <div className="mt-2 min-h-8 space-y-0.5">
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
              {po.statusLine}
            </p>
            {poState.hasBatches && poState.batches ? (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {poState.batches.length}{' '}
                  {poState.batches.length === 1 ? 'batch' : 'batches'} ·{' '}
                  {poState.batches
                    .map(
                      b =>
                        `${formatBatchTime(b.startTime)} (${b.remaining} left)`
                    )
                    .join(', ')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total remaining: {p.stock}
                  {p.stockUnit ? ` ${stockUnitLabel(p.stockUnit)}` : ''}
                </p>
              </>
            ) : null}
            {preOrderLimitLabel(p) && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {preOrderLimitLabel(p)}
              </p>
            )}
          </div>
        ) : p.description ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 min-h-8">
            {p.description}
          </p>
        ) : (
          <div className="mt-2 min-h-8" />
        )}

        <div className="mt-auto flex items-center gap-2 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(p)}
            className="flex-1"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(p)}
            disabled={isDeleting}
            className="flex-1 bg-red-600 text-white hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden border-gray-100 dark:border-gray-700 p-0">
      <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
            <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
          </div>
          <div className="space-y-2 items-end flex flex-col shrink-0">
            <div className="h-4 w-14 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
            <div className="h-3 w-10 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
        <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
        <div className="flex gap-2 pt-1">
          <div className="h-8 flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-8 flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
