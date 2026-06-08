import {Button} from '@/components/ui/button';
import {Plus, Users} from 'lucide-react';

interface Props {
  showButton: boolean;
  onAdd: () => void;
}

export function CashiersHeader({showButton, onAdd}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-[#2d4a35]">
          Cashiers Management
        </h1>
        <p className="text-sm text-gray-500">
          Manage your cashier accounts and their access.
        </p>
      </div>
      {showButton && (
        <Button onClick={onAdd} className="bg-[#2d4a35] hover:bg-[#24402c]">
          <Plus className="h-4 w-4" />
          Add Cashier
        </Button>
      )}
    </div>
  );
}
