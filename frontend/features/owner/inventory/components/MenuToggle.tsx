'use client';

import {CircleAlert} from 'lucide-react';

interface Props {
  checked: boolean;
  busy?: boolean;
  warn?: boolean;
  onChange: (next: boolean) => void;
}

export function MenuToggle({checked, busy = false, warn = false, onChange}: Props) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {warn && (
        <span
          title="On the menu but out of stock"
          className="text-red-500"
        >
          <CircleAlert className="h-4 w-4" />
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={checked ? 'On the menu' : 'Off the menu'}
        disabled={busy}
        onClick={e => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d4a35]/40 ${
          checked ? 'bg-[#2d4a35]' : 'bg-gray-300'
        } ${busy ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}