import {Button} from '@/components/ui/button';
import {Modal} from './Modal';

interface Props {
  open: boolean;
  cashierName: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DisableCashierModal({open, cashierName, isPending, onConfirm, onClose}: Props) {
  return (
    <Modal open={open} title={`Disable "${cashierName}"`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-bold text-gray-900 dark:text-gray-100">{cashierName}</span> will be
          signed out on every device and can&apos;t sign in until you enable the account again. Their
          orders and activity history stay.
        </p>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Disabling…' : 'Disable Cashier'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
