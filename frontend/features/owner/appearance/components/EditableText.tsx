'use client';

import {useState, useRef, useEffect, type KeyboardEvent} from 'react';

interface Props {
  value: string;
  onSave: (value: string) => Promise<void>;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  className?: string;
  placeholder?: string;
}

export default function EditableText({
  value,
  onSave,
  tag: Tag = 'span',
  className = '',
  placeholder = 'Click to edit...'
}: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && elRef.current) {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(elRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  async function finishEditing() {
    const text = elRef.current?.textContent?.trim() || '';
    if (text !== value && text) {
      setSaving(true);
      await onSave(text);
      setSaving(false);
    }
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishEditing();
    }
    if (e.key === 'Escape') {
      if (elRef.current) elRef.current.textContent = value;
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <Tag
        ref={elRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={finishEditing}
        onKeyDown={handleKeyDown}
        className={`rounded px-0.5 outline-2 outline-dashed outline-[#3c5e45] outline-offset-1 ${className}`}
        dangerouslySetInnerHTML={{__html: value}}
      />
    );
  }

  return (
    <Tag
      onClick={e => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={`cursor-pointer rounded px-0.5 transition-colors hover:outline hover:outline-1 hover:outline-dashed hover:outline-[#3c5e45] ${className}`}
      title="Click to edit"
    >
      {value || (
        <span className="italic text-gray-300">{placeholder}</span>
      )}
      {saving && <span className="ml-1 text-xs text-gray-400">...</span>}
    </Tag>
  );
}
