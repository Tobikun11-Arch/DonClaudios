import {Button} from '@/components/ui/button';
import {Plus} from 'lucide-react';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';

interface Props {
  showButton: boolean;
  onAdd: () => void;
}

export function ProductsHeader({showButton, onAdd}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-[#2d4a35]">
          Products Management
        </h1>
        <p className="text-sm text-gray-500">
          Manage your menu items and categories.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {showButton && (
          <Button onClick={onAdd} className="bg-[#2d4a35] hover:bg-[#24402c]">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        )}
        <OwnerNotificationBell />
      </div>
    </div>
  );
}