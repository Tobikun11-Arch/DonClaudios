'use client';

import {useState, useRef, useEffect, useCallback} from 'react';
import {Paintbrush, X} from 'lucide-react';
import type {SectionId, SectionStyle} from '@/lib/types/settings';
import {cn} from '@/lib/utils';

const FONT_OPTIONS = [
  {value: '', label: 'Default'},
  {value: "'Inter', sans-serif", label: 'Inter'},
  {value: "'Playfair Display', serif", label: 'Playfair Display'},
  {value: "'Lora', serif", label: 'Lora'},
  {value: "'Poppins', sans-serif", label: 'Poppins'},
  {value: "'Montserrat', sans-serif", label: 'Montserrat'},
  {value: "'Roboto', sans-serif", label: 'Roboto'},
  {value: "'Open Sans', sans-serif", label: 'Open Sans'},
  {value: 'Georgia, serif', label: 'Georgia'},
  {value: 'Arial, sans-serif', label: 'Arial'},
  {value: "'Courier New', monospace", label: 'Courier New'},
];

const SECTION_LABELS: Record<SectionId, string> = {
  hero: 'Hero',
  highlights: 'Highlights',
  promo: 'Promo',
  about: 'About',
  reviews: 'Reviews',
  contact: 'Contact'
};

interface Props {
  sectionId: SectionId;
  style: SectionStyle;
  defaultBgColor?: string;
  defaultTextColor?: string;
  onStyleChange: (sectionId: SectionId, style: SectionStyle) => void;
  children: React.ReactNode;
}

export default function SectionToolbar({sectionId, style, defaultBgColor = '#ffffff', defaultTextColor = '#3c5e45', onStyleChange, children}: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      panelRef.current && !panelRef.current.contains(e.target as Node) &&
      btnRef.current && !btnRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const update = (patch: Partial<SectionStyle>) => {
    onStyleChange(sectionId, {...style, ...patch});
  };

  const hasCustomBg = style.backgroundColor !== '';
  const hasCustomText = style.textColor !== '';
  const hasCustomFont = style.fontFamily !== '';
  const hasAnyCustom = hasCustomBg || hasCustomText || hasCustomFont;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}

      {/* Paint icon button */}
      {(hovered || open) && (
        <button
          ref={btnRef}
          onClick={() => setOpen(prev => !prev)}
          className={cn(
            'absolute top-4 right-4 z-40 p-2.5 rounded-full shadow-lg transition-all duration-200',
            open
              ? 'bg-[#3c5e45] text-white scale-110'
              : 'bg-white/90 text-[#3c5e45] hover:bg-white hover:scale-105'
          )}
          title={`Customize ${SECTION_LABELS[sectionId]} section`}
        >
          <Paintbrush className="w-4 h-4" />
          {hasAnyCustom && !open && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-white" />
          )}
        </button>
      )}

      {/* Editor panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute top-4 right-16 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-72 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h4 className="text-sm font-bold text-gray-800">
              {SECTION_LABELS[sectionId]} Section
            </h4>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Background color */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Background Color
              </label>
              <div className="flex items-center gap-2">
                <label className="relative w-9 h-9 rounded-lg overflow-hidden border border-gray-200 shrink-0 cursor-pointer">
                  <input
                    type="color"
                    value={style.backgroundColor || defaultBgColor}
                    onChange={e => update({backgroundColor: e.target.value})}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-full h-full rounded-lg"
                    style={{backgroundColor: style.backgroundColor || defaultBgColor}}
                  />
                </label>
                <input
                  type="text"
                  value={style.backgroundColor}
                  onChange={e => {
                    if (/^#[0-9a-f]{0,6}$/i.test(e.target.value) || e.target.value === '') {
                      update({backgroundColor: e.target.value});
                    }
                  }}
                  placeholder={defaultBgColor}
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-md focus:outline-none focus:border-[#3c5e45]"
                />
                {hasCustomBg && (
                  <button
                    onClick={() => update({backgroundColor: ''})}
                    className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                    title="Reset to default"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Text color */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Text Color
              </label>
              <div className="flex items-center gap-2">
                <label className="relative w-9 h-9 rounded-lg overflow-hidden border border-gray-200 shrink-0 cursor-pointer">
                  <input
                    type="color"
                    value={style.textColor || defaultTextColor}
                    onChange={e => update({textColor: e.target.value})}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-full h-full rounded-lg"
                    style={{backgroundColor: style.textColor || defaultTextColor}}
                  />
                </label>
                <input
                  type="text"
                  value={style.textColor}
                  onChange={e => {
                    if (/^#[0-9a-f]{0,6}$/i.test(e.target.value) || e.target.value === '') {
                      update({textColor: e.target.value});
                    }
                  }}
                  placeholder={defaultTextColor}
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-md focus:outline-none focus:border-[#3c5e45]"
                />
                {hasCustomText && (
                  <button
                    onClick={() => update({textColor: ''})}
                    className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                    title="Reset to default"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Font family */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Font Family
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={style.fontFamily}
                  onChange={e => update({fontFamily: e.target.value})}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#3c5e45] bg-white"
                >
                  {FONT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {hasCustomFont && (
                  <button
                    onClick={() => update({fontFamily: ''})}
                    className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                    title="Reset to default"
                  >
                    Reset
                  </button>
                )}
              </div>
              {style.fontFamily && (
                <p className="mt-1.5 text-xs text-gray-400 italic" style={{fontFamily: style.fontFamily}}>
                  Preview: The quick brown fox jumps over the lazy dog
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
