'use client';

import {useEffect} from 'react';
import {X} from 'lucide-react';
import {cn} from '@/lib/utils';

/**
 * Centered modal on tablets/desktop, bottom sheet on phones. Escape and a tap
 * on the backdrop close it unless `dismissible` is false (e.g. while saving).
 */
export default function CounterDialog({
  open,
  onClose,
  title,
  children,
  footer,
  dismissible = true,
  className
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  dismissible?: boolean;
  className?: string;
}) {
  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={dismissible ? onClose : undefined}
      />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'pointer-events-auto flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl',
            className
          )}
        >
          {title && (
            <div className="flex items-start justify-between gap-3 px-5 pt-5">
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              {dismissible && (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
          {footer && (
            <div className="flex gap-2 border-t border-gray-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
