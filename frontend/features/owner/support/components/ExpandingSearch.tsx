'use client';

import {useRef} from 'react';
import {Search, X} from 'lucide-react';

/**
 * Search icon that smoothly grows into a full-width search field over the
 * row it sits in (the parent must be `relative`). Esc or X clears and closes.
 */
export default function ExpandingSearch({
  open,
  value,
  placeholder,
  onOpenChange,
  onChange
}: {
  open: boolean;
  value: string;
  placeholder: string;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const expand = () => {
    onOpenChange(true);
    // Focus once the field is interactive (after this click's render).
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const collapse = () => {
    onChange('');
    onOpenChange(false);
  };

  return (
    <div
      className={`absolute right-3 top-1/2 z-10 flex h-8 -translate-y-1/2 items-center overflow-hidden rounded-full border bg-white transition-[width,border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none dark:bg-gray-900 ${
        open
          ? 'w-[calc(100%-1.5rem)] border-[#6b8a6e] shadow-md'
          : 'w-8 border-transparent shadow-none'
      }`}
    >
      <button
        type="button"
        onClick={open ? () => inputRef.current?.focus() : expand}
        aria-label="Search conversations"
        aria-expanded={open}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
          open
            ? 'text-[#2d4a35] dark:text-[#7ed4a0]'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
        }`}
      >
        <Search size={14} />
      </button>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            collapse();
          }
        }}
        placeholder={placeholder}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        className={`min-w-0 flex-1 bg-transparent text-xs text-gray-900 placeholder:text-gray-400 outline-none transition-opacity duration-200 dark:text-gray-100 ${
          open ? 'opacity-100 delay-100' : 'pointer-events-none opacity-0'
        }`}
      />
      {open && (
        <button
          type="button"
          onClick={collapse}
          aria-label="Close search"
          className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
