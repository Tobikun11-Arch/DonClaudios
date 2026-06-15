'use client';

import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import type {Colors} from '@/lib/types/settings';

const COLOR_LABELS: Record<keyof Colors, string> = {
  primary: 'Primary Green',
  accent: 'Accent Gold',
  muted: 'Muted Sage',
  darkGreen: 'Dark Green',
  mediumGreen: 'Medium Green',
  lightGreen: 'Light Green',
  beige: 'Beige',
  red: 'Red'
};

type ColorsEditorProps = {
  colors: Colors;
  onChange: (key: keyof Colors, value: string) => void;
};

export default function ColorsEditor({colors, onChange}: ColorsEditorProps) {
  const keys = Object.keys(COLOR_LABELS) as (keyof Colors)[];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {keys.map(key => (
        <div key={key} className="space-y-2">
          <Label>{COLOR_LABELS[key]}</Label>
          <div className="flex items-center gap-2">
            <div
              className="h-9 w-9 rounded-md border shrink-0"
              style={{backgroundColor: colors[key]}}
            />
            <Input
              value={colors[key]}
              onChange={e => onChange(key, e.target.value)}
              placeholder="#000000"
              className="font-mono"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
