'use client';

import {AlertTriangle} from 'lucide-react';
import {Button} from '@/components/ui/button';

export type AttentionItem = {
  key: string;
  text: string;
  actionLabel: string;
  actionVariant?: 'ghost' | 'default';
  onAction: () => void;
};

interface Props {
  items: AttentionItem[];
}

export function AttentionBanner({items}: Props) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 flex-1 min-w-0">
        {items.map(item => (
          <div key={item.key} className="flex items-center gap-2">
            <p className="text-sm font-medium text-amber-900">{item.text}</p>
            <Button
              variant={item.actionVariant ?? 'ghost'}
              size="sm"
              onClick={item.onAction}
              className={cnFor(item.key, item.actionVariant)}
            >
              {item.actionLabel}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function cnFor(key: string, variant?: 'ghost' | 'default'): string {
  const base = 'shrink-0 text-xs font-bold';
  if (variant === 'default') return `${base} bg-[#2d4a35] text-white hover:bg-[#24402c]`;
  if (key === 'sellableOut')
    return `${base} bg-amber-600 text-white hover:bg-amber-700`;
  return `${base} text-amber-800 hover:bg-amber-100/80`;
}