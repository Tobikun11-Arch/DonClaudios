'use client';

import {useState} from 'react';
import {Palette, X} from 'lucide-react';
import type {Colors} from '@/lib/types/settings';

interface Props {
  colors: Colors;
  onChange: (colors: Colors) => void;
}

const COLOR_FIELDS: {key: keyof Colors; label: string}[] = [
  {key: 'primary', label: 'Primary'},
  {key: 'accent', label: 'Accent'},
  {key: 'muted', label: 'Muted'},
  {key: 'darkGreen', label: 'Dark Green'},
  {key: 'mediumGreen', label: 'Medium Green'},
  {key: 'lightGreen', label: 'Light Green'},
  {key: 'beige', label: 'Beige'},
  {key: 'red', label: 'Red'}
];

export default function ColorPickerPanel({colors, onChange}: Props) {
  const [open, setOpen] = useState(false);

  function handleColorChange(key: keyof Colors, value: string) {
    onChange({...colors, [key]: value});
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 bg-[#3c5e45] text-white p-3 rounded-full shadow-lg hover:bg-[#2d4a35] transition-colors"
        title="Brand Colors"
      >
        <Palette size={24} />
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 w-72">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#3c5e45]">Brand Colors</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {COLOR_FIELDS.map(({key, label}) => (
              <div key={key} className="flex items-center gap-3">
                <label
                  htmlFor={`color-${key}`}
                  className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shrink-0 cursor-pointer"
                >
                  <input
                    id={`color-${key}`}
                    type="color"
                    value={colors[key]}
                    onChange={e =>
                      handleColorChange(key, e.target.value)
                    }
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-full h-full"
                    style={{backgroundColor: colors[key]}}
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {label}
                  </p>
                  <input
                    type="text"
                    value={colors[key]}
                    onChange={e => {
                      const val = e.target.value;
                      if (/^#[0-9a-f]{0,6}$/i.test(val) || val === '') {
                        handleColorChange(key, val);
                      }
                    }}
                    onBlur={() => {
                      if (!colors[key]) {
                        handleColorChange(key, '#000000');
                      }
                    }}
                    className="w-full px-2 py-1 text-xs font-mono border border-gray-200 rounded-md focus:outline-none focus:border-[#3c5e45]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
