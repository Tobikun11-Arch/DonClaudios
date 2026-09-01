import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import {User, Pencil, Trash2, Mail, Phone, MapPin} from 'lucide-react';
import type {Cashier} from '@/lib/types/cashier';

interface Props {
  cashier: Cashier;
  onEdit: (c: Cashier) => void;
  onDelete: (c: Cashier) => void;
  isDeleting: boolean;
}

export function CashierCard({cashier: c, onEdit, onDelete, isDeleting}: Props) {
  return (
    <Card className="overflow-hidden border-gray-100 p-0">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 break-words">
                {c.firstName} {c.lastName}
              </p>
              <p className="text-xs text-gray-500 break-words">@{c.username}</p>
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 text-[11px] font-bold px-3 py-1 rounded-full border',
              c.isOnline
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            )}
          >
            {c.isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{c.email}</span>
          </div>
          {c.phoneNumber && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{c.phoneNumber}</span>
            </div>
          )}
          {c.address && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{c.address}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(c)}
            className="flex-1"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(c)}
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

export function CashierCardSkeleton() {
  return (
    <Card className="overflow-hidden border-gray-100 p-0">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-3/4 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-3 w-1/3 bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse shrink-0" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-gray-100 rounded-full animate-pulse" />
          <div className="h-3 w-2/3 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-8 flex-1 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-8 flex-1 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
