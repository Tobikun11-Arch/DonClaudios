'use client';

import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {Plus, Trash2} from 'lucide-react';
import type {HighlightImage} from '@/lib/types/settings';

type HighlightsEditorProps = {
  title: string;
  images: HighlightImage[];
  onChange: (field: string, value: unknown) => void;
};

export default function HighlightsEditor({
  title,
  images,
  onChange
}: HighlightsEditorProps) {
  const addImage = () => {
    onChange('images', [...images, {url: '', alt: ''}]);
  };

  const updateImage = (index: number, field: 'url' | 'alt', val: string) => {
    const updated = images.map((img, i) =>
      i === index ? {...img, [field]: val} : img
    );
    onChange('images', updated);
  };

  const removeImage = (index: number) => {
    onChange('images', images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={title}
          onChange={e => onChange('title', e.target.value)}
          placeholder="Visit Our DonClaudio's Lechon House"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Images</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addImage}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Image
          </Button>
        </div>
        {images.map((img, i) => (
          <div key={i} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Image URL</Label>
              <Input
                value={img.url}
                onChange={e => updateImage(i, 'url', e.target.value)}
                placeholder="/assets/highlights1.JPG"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Alt Text</Label>
              <Input
                value={img.alt}
                onChange={e => updateImage(i, 'alt', e.target.value)}
                placeholder="Restaurant Interior"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeImage(i)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {images.length === 0 && (
          <p className="text-xs text-gray-400">No images added yet.</p>
        )}
      </div>
    </div>
  );
}
