'use client';

import {useState, useRef, useEffect, useCallback} from 'react';
import {Paintbrush, RotateCcw, X} from 'lucide-react';
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

// Windows' native color picker is unresponsive when it opens on the pure white/black
// extremes OR any color close to them: the crosshair area doesn't change RGB, so the
// first selection silently fails. That includes colors like '#fefefe' users may have
// saved. Open the picker on a mid-tone brand color instead — picking from there always
// registers, and dismissing without a change fires no event, so the preview stays
// untouched.
function safePickerHex(value: string): string {
  const hex = value.toLowerCase().replace('#', '');
  if (/^[0-9a-f]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ((r >= 240 && g >= 240 && b >= 240) || (r <= 15 && g <= 15 && b <= 15)) {
      return '#5b8f6a';
    }
  }
  return value;
}

interface Props {
  sectionId: SectionId;
  style: SectionStyle;
  defaultBgColor?: string;
  defaultTextColor?: string;
  onDraftChange: (sectionId: SectionId, style: Partial<SectionStyle>) => void;
  onConfirm: (sectionId: SectionId) => void;
  children: React.ReactNode;
}

export default function SectionToolbar({sectionId, style, defaultBgColor = '#ffffff', defaultTextColor = '#3c5e45', onDraftChange, onConfirm, children}: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [saved, setSaved] = useState({backgroundColor: style.backgroundColor, textColor: style.textColor, fontFamily: style.fontFamily});
  const [localBg, setLocalBg] = useState(style.backgroundColor || defaultBgColor);
  const [localText, setLocalText] = useState(style.textColor || defaultTextColor);
  const [localFont, setLocalFont] = useState(style.fontFamily);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    setOpen(prev => {
      const next = !prev;
      if (next) {
        setSaved({backgroundColor: style.backgroundColor, textColor: style.textColor, fontFamily: style.fontFamily});
        setLocalBg(style.backgroundColor || defaultBgColor);
        setLocalText(style.textColor || defaultTextColor);
        setLocalFont(style.fontFamily);
      }
      return next;
    });
  };

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

  const hasCustom = style.backgroundColor !== '' || style.textColor !== '' || style.fontFamily !== '';

  const hasChanges =
    localBg !== (saved.backgroundColor || defaultBgColor) ||
    localText !== (saved.textColor || defaultTextColor) ||
    localFont !== saved.fontFamily;

  const save = () => {
    onConfirm(sectionId);
    setOpen(false);
  };

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
          onClick={toggle}
          className={cn(
            'absolute top-4 right-4 z-40 p-2.5 rounded-full shadow-lg transition-all duration-200',
            open
              ? 'bg-[#3c5e45] text-white scale-110'
              : 'bg-white/90 text-[#3c5e45] hover:bg-white hover:scale-105'
          )}
          title={`Customize ${SECTION_LABELS[sectionId]} section`}
        >
          <Paintbrush className="w-4 h-4" />
          {hasCustom && !open && (
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
                    value={safePickerHex(localBg)}
                    onChange={e => {
                      setLocalBg(e.target.value);
                      onDraftChange(sectionId, {backgroundColor: e.target.value});
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-full h-full rounded-lg"
                    style={{backgroundColor: localBg}}
                  />
                </label>
                <input
                  type="text"
                  value={localBg}
                  onChange={e => {
                    const val = e.target.value;
                    if (/^#[0-9a-f]{0,6}$/i.test(val) || val === '' || val === '#') {
                      setLocalBg(val);
                      onDraftChange(sectionId, {backgroundColor: val});
                    }
                  }}
                  placeholder={defaultBgColor}
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-md focus:outline-none focus:border-[#3c5e45]"
                />
                {style.backgroundColor !== '' && (
                  <button
                    onClick={() => {
                      setLocalBg(defaultBgColor);
                      onDraftChange(sectionId, {backgroundColor: ''});
                    }}
                    className="text-gray-400 hover:text-red-500 shrink-0"
                    title="Reset to default"
                  >
                    <RotateCcw className="w-4 h-4" />
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
                    value={safePickerHex(localText)}
                    onChange={e => {
                      setLocalText(e.target.value);
                      onDraftChange(sectionId, {textColor: e.target.value});
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-full h-full rounded-lg"
                    style={{backgroundColor: localText}}
                  />
                </label>
                <input
                  type="text"
                  value={localText}
                  onChange={e => {
                    const val = e.target.value;
                    if (/^#[0-9a-f]{0,6}$/i.test(val) || val === '' || val === '#') {
                      setLocalText(val);
                      onDraftChange(sectionId, {textColor: val});
                    }
                  }}
                  placeholder={defaultTextColor}
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-md focus:outline-none focus:border-[#3c5e45]"
                />
                {style.textColor !== '' && (
                  <button
                    onClick={() => {
                      setLocalText(defaultTextColor);
                      onDraftChange(sectionId, {textColor: ''});
                    }}
                    className="text-gray-400 hover:text-red-500 shrink-0"
                    title="Reset to default"
                  >
                    <RotateCcw className="w-4 h-4" />
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
                  value={localFont}
                  onChange={e => {
                    setLocalFont(e.target.value);
                    onDraftChange(sectionId, {fontFamily: e.target.value});
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#3c5e45] bg-white"
                >
                  {FONT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {style.fontFamily && (
                  <button
                    onClick={() => {
                      setLocalFont('');
                      onDraftChange(sectionId, {fontFamily: ''});
                    }}
                    className="text-gray-400 hover:text-red-500 shrink-0"
                    title="Reset to default"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
              {localFont && (
                <p className="mt-1.5 text-xs text-gray-400 italic" style={{fontFamily: localFont}}>
                  Preview: The quick brown fox jumps over the lazy dog
                </p>
              )}
            </div>

            {/* Save button */}
            <button
              onClick={save}
              disabled={!hasChanges}
              className={cn(
                'w-full py-2 rounded-lg text-sm font-semibold transition-colors',
                hasChanges
                  ? 'bg-[#3c5e45] text-white hover:bg-[#2d4a35]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
