'use client';

import {Button} from '@/components/ui/button';
import {Modal} from './Modal';

interface Props {
  open: boolean;
  promoTitle: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeletePromoModal({
  open,
  promoTitle,
  isPending,
  onClose,
  onConfirm
}: Props) {
  return (
    <Modal open={open} title="Delete Promo" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Are you sure you want to delete <b>{promoTitle}</b>?
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
