'use client';

import {useState} from 'react';
import {ChevronDown, ChevronUp} from 'lucide-react';
import {cn} from '@/lib/utils';

type SectionCardProps = {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
};

export default function SectionCard({
  title,
  defaultExpanded = true,
  children
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl border bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h3 className="text-lg font-bold text-[#2d4a35]">{title}</h3>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-[#4a7c59]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[#4a7c59]" />
        )}
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          expanded ? 'max-h-[9999px]' : 'max-h-0'
        )}
      >
        <div className="px-6 pb-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}
