import {Button} from '@/components/ui/button';
import {Modal} from './Modal';

interface Props {
  open: boolean;
  cashierName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteCashierModal({
  open,
  cashierName,
  isDeleting,
  onConfirm,
  onClose
}: Props) {
  return (
    <Modal
      open={open}
      title={`Delete "${cashierName}"`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete{' '}
          <span className="font-bold text-gray-900">{cashierName}</span>?
          This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete Cashier'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
