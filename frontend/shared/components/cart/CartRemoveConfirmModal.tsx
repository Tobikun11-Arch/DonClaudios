'use client';

import {Button} from '@/components/ui/button';
import {X} from 'lucide-react';

type CartRemoveConfirmModalProps = {
  itemName: string;
  isOpen: boolean;
  isRemoving?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function CartRemoveConfirmModal({
  itemName,
  isOpen,
  isRemoving = false,
  onCancel,
  onConfirm
}: CartRemoveConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900">Remove item?</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-gray-900">{itemName}</span>{' '}
              from your cart?
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={onCancel}
            disabled={isRemoving}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isRemoving}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isRemoving}
            className="rounded-full bg-[#c30010] text-white hover:bg-[#a6000d]"
          >
            {isRemoving ? 'Removing...' : 'Remove'}
          </Button>
        </div>
      </div>
    </div>
  );
}
