import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import {Package, Pencil, Trash2} from 'lucide-react';
import Image from 'next/image';
import {formatPeso} from '../utils/formatPeso';
import {Product} from '@/lib/types/product';

interface Props {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  isDeleting: boolean;
}

export function ProductCard({product: p, onEdit, onDelete, isDeleting}: Props) {
  return (
    <Card className="overflow-hidden border-gray-100">
      <div className="relative h-40 bg-gray-50">
        {p.imageUrl ? (
          <Image
            src={p.imageUrl}
            alt={p.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 25vw"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-300">
            <Package className="h-10 w-10" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span
            className={cn(
              'text-[11px] font-bold px-3 py-1 rounded-full border',
              p.isAvailable
                ? 'bg-[#e9f5ee] text-[#2d4a35] border-[#c9e7d4]'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            )}
          >
            {p.isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}
          </span>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 truncate">{p.name}</p>
            <p className="text-xs text-gray-500 truncate">{p.category}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-extrabold text-gray-900">
              {formatPeso(p.price)}
            </p>
            <p className="text-xs text-gray-500">Stock: {p.stock}</p>
          </div>
        </div>

        {p.description ? (
          <p className="mt-2 text-xs text-gray-500 line-clamp-2 min-h-8">
            {p.description}
          </p>
        ) : (
          <div className="mt-2 min-h-8" />
        )}

        <div className="mt-3 flex items-center gap-2">
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
            className="flex-1"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
