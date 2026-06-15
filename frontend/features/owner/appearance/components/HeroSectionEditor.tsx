'use client';

import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {Plus, Trash2} from 'lucide-react';
import type {HeroStat} from '@/lib/types/settings';

type HeroSectionEditorProps = {
  title: string;
  highlightedWord: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  backgroundImage: string;
  stats: HeroStat[];
  onChange: (field: string, value: unknown) => void;
};

export default function HeroSectionEditor({
  title,
  highlightedWord,
  subtitle,
  ctaText,
  ctaLink,
  backgroundImage,
  stats,
  onChange
}: HeroSectionEditorProps) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={e => onChange('title', e.target.value)}
            placeholder="Authentic Filipino"
          />
        </div>
        <div className="space-y-2">
          <Label>Highlighted Word</Label>
          <Input
            value={highlightedWord}
            onChange={e => onChange('highlightedWord', e.target.value)}
            placeholder="Lechon"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input
            value={subtitle}
            onChange={e => onChange('subtitle', e.target.value)}
            placeholder="Slow-roasted to perfection..."
          />
        </div>
        <div className="space-y-2">
          <Label>CTA Text</Label>
          <Input
            value={ctaText}
            onChange={e => onChange('ctaText', e.target.value)}
            placeholder="Place Your Order"
          />
        </div>
        <div className="space-y-2">
          <Label>CTA Link</Label>
          <Input
            value={ctaLink}
            onChange={e => onChange('ctaLink', e.target.value)}
            placeholder="/order"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Background Image URL</Label>
        <Input
          value={backgroundImage}
          onChange={e => onChange('backgroundImage', e.target.value)}
          placeholder="/assets/hero_image.JPG"
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
                placeholder="1000+"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={stat.label}
                onChange={e => updateStat(i, 'label', e.target.value)}
                placeholder="Happy Customers"
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
