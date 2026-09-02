'use client';

import {useRef, useState} from 'react';
import Image from 'next/image';
import {Camera, Loader2, X} from 'lucide-react';
import {toast} from 'sonner';
import {uploadSectionImage} from '@/lib/api/uploadApi';

interface Props {
  src: string;
  alt: string;
  onSaved: (url: string) => Promise<void>;
  fill?: boolean;
  className?: string;
  showRemove?: boolean;
  onRemove?: () => Promise<void>;
}

export default function EditableImage({
  src,
  alt,
  onSaved,
  fill = true,
  className = '',
  showRemove = false,
  onRemove
}: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    setUploading(true);
    try {
      const {imageUrl} = await uploadSectionImage(file);
      await onSaved(imageUrl);
      toast.success('Image updated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
      console.error('Image upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="group relative w-full h-full">
      {fill ? (
        <Image src={src} alt={alt} fill className={`object-cover ${className}`} />
      ) : (
        <Image src={src} alt={alt} width={800} height={600} className={`object-cover w-full h-full ${className}`} />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {/* Edit overlay — appears on hover */}
      <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center pointer-events-none">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 text-[#3c5e45] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 font-semibold text-sm"
          title="Change image"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" /> Change Image
            </>
          )}
        </button>
      </div>

      {/* Remove bubble (only when showRemove) */}
      {showRemove && (
        <button
          type="button"
          onClick={() => onRemove?.()}
          className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full bg-white/90 shadow text-gray-500 hover:text-red-600"
          title="Reset to default"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}