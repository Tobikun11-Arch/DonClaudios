import {Button} from '@/components/ui/button';
import type {Promo} from '@/lib/types/promo';
import Image from 'next/image';

interface Props {
  promo: Promo;
  onEdit: (p: Promo) => void;
  onDelete: (p: Promo) => void;
}

function formatDate(v?: string) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString();
}

function getStatus(p: Promo): 'active' | 'upcoming' | 'expired' | 'inactive' {
  if (!p.isActive) return 'inactive';
  const now = new Date();
  const start = new Date(p.startDate);
  const end = new Date(p.endDate);
  if (now < start) return 'upcoming';
  if (now > end) return 'expired';
  return 'active';
}

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getDiscountLabel(p: Promo) {
  const parts: string[] = [];
  if (typeof p.discountRate === 'number') parts.push(`${p.discountRate}% off`);
  if (typeof p.discountAmount === 'number')
    parts.push(`₱${formatMoney(p.discountAmount)} off`);
  if (parts.length === 0) {
    if (p.promoType === 'bundle') return 'Bundle deal';
    return 'Promo';
  }
  return parts.join(' + ');
}

function formatPromoType(type: Promo['promoType']) {
  if (type === 'percentage') return 'Percentage';
  if (type === 'fixed_amount') return 'Fixed Amount';
  return 'Bundle';
}

export function PromoCard({promo, onEdit, onDelete}: Props) {
  const status = getStatus(promo);
  const discountLabel = getDiscountLabel(promo);
  const promoTypeLabel = formatPromoType(promo.promoType);

  return (
    <div className="border border-gray-100 bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="relative aspect-[16/9] bg-gray-50">
        {promo.imageUrl ? (
          <Image
            src={promo.imageUrl}
            alt={promo.title}
            fill
            sizes="512px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            No image
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span
            className={
              'text-xs font-bold px-2.5 py-1 rounded-full ' +
              (status === 'active'
                ? 'bg-green-100 text-green-800'
                : status === 'upcoming'
                  ? 'bg-blue-100 text-blue-800'
                  : status === 'expired'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-700')
            }
          >
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-extrabold text-gray-900 leading-tight">
              {promo.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{promoTypeLabel}</p>
            {promo.description ? (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                {promo.description}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-extrabold text-[#2d4a35]">
              {discountLabel}
            </p>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onEdit(promo)}>
            Edit
          </Button>
          <Button variant="destructive" onClick={() => onDelete(promo)}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PromoCardSkeleton() {
  return (
    <div className="border border-gray-100 bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="aspect-[16/9] bg-gray-100 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-2/3 bg-gray-100 animate-pulse rounded" />
        <div className="h-3 w-full bg-gray-100 animate-pulse rounded" />
        <div className="h-3 w-1/2 bg-gray-100 animate-pulse rounded" />
        <div className="flex justify-end gap-2 pt-2">
          <div className="h-9 w-20 bg-gray-100 animate-pulse rounded" />
          <div className="h-9 w-20 bg-gray-100 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
