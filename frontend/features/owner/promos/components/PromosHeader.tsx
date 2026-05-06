import {Button} from '@/components/ui/button';
import {Tag, Plus} from 'lucide-react';

interface Props {
  onCreate: () => void;
}

export function PromosHeader({onCreate}: Props) {
  return (
    <div className="flex items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center">
          <Tag className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Promos</h1>
          <p className="text-sm text-gray-500">
            Manage promo campaigns, discounts, and schedule.
          </p>
        </div>
      </div>

      <Button
        onClick={onCreate}
        className="bg-[#2d4a35] hover:bg-[#24402c]"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Promo
      </Button>
    </div>
  );
}
