import {Package} from 'lucide-react';
import {type ReactNode} from 'react';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({open, title, children, onClose}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">Fill out the details then save.</p>
              </div>
            </div>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}