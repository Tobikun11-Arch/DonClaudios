'use client';

import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {Plus, Trash2} from 'lucide-react';
import type {AboutStat} from '@/lib/types/settings';

type AboutEditorProps = {
  title: string;
  description: string;
  stats: AboutStat[];
  onChange: (field: string, value: unknown) => void;
};

export default function AboutEditor({
  title,
  description,
  stats,
  onChange
}: AboutEditorProps) {
  const addStat = () => {
    onChange('stats', [...stats, {value: '', label: ''}]);
  };

  const updateStat = (index: number, field: 'value' | 'label', val: string) => {
    const updated = stats.map((s, i) =>
      i === index ? {...s, [field]: val} : s
    );
    onChange('stats', updated);
  };

  const removeStat = (index: number) => {
    onChange('stats', stats.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={e => onChange('title', e.target.value)}
          placeholder="Our Story"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <textarea
          value={description}
          onChange={e => onChange('description', e.target.value)}
          rows={5}
          className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground resize-y"
          placeholder="Tell your story..."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Stats</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStat}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Stat
          </Button>
        </div>
        {stats.map((stat, i) => (
          <div key={i} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Value</Label>
              <Input
                value={stat.value}
                onChange={e => updateStat(i, 'value', e.target.value)}
                placeholder="100%"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={stat.label}
                onChange={e => updateStat(i, 'label', e.target.value)}
                placeholder="Fresh & Quality"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeStat(i)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {stats.length === 0 && (
          <p className="text-xs text-gray-400">No stats added yet.</p>
        )}
      </div>
    </div>
  );
}
