import {Users} from 'lucide-react';
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
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <div
          className="w-full sm:max-w-2xl bg-white shadow-xl border border-gray-100 rounded-t-2xl sm:rounded-2xl
          h-full sm:h-auto flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">
                  Fill out the details then save.
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
