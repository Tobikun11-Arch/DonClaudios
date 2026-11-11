import {Button} from '@/components/ui/button';
import {Plus} from 'lucide-react';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';

interface Props {
  onCreate: () => void;
}

export function PromosHeader({onCreate}: Props) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold text-[#2d4a35] dark:text-[#7ed4a0]">Promos</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage promo campaigns, discounts, and schedule.
        </p>
      </div>

      <div className="order-last flex w-full items-center gap-2 sm:order-none sm:w-auto">
        <Button
          onClick={onCreate}
          className="flex-1 bg-[#2d4a35] hover:bg-[#24402c] dark:text-white sm:flex-none"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Promo
        </Button>
      </div>
      <OwnerNotificationBell />
    </div>
  );
}
