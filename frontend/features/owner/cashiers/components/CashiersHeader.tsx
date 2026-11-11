import {Button} from '@/components/ui/button';
import {Plus} from 'lucide-react';

interface Props {
  showButton: boolean;
  onAdd: () => void;
  /** Inside Settings the page already titles the section, so only the action shows. */
  hideTitle?: boolean;
}

export function CashiersHeader({showButton, onAdd, hideTitle = false}: Props) {
  if (hideTitle) {
    return showButton ? (
      <div className="flex justify-end">
        <Button onClick={onAdd} className="bg-[#2d4a35] hover:bg-[#24402c] dark:text-white">
          <Plus className="h-4 w-4" />
          Add Cashier
        </Button>
      </div>
    ) : null;
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-[#2d4a35] dark:text-[#7ed4a0]">
          Cashiers
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your cashier accounts and their access.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {showButton && (
          <Button onClick={onAdd} className="bg-[#2d4a35] hover:bg-[#24402c] dark:text-white">
            <Plus className="h-4 w-4" />
            Add Cashier
          </Button>
        )}
      </div>
    </div>
  );
}
