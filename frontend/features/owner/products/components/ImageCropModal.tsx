'use client';

import {useRef, useState, useCallback} from 'react';
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {Modal} from './Modal';
import {Button} from '@/components/ui/button';

interface Props {
  open: boolean;
  src: string;
  aspect?: number; // e.g. 16/9
  onCancel: () => void;
  onCropDone: (blob: Blob) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop({unit: '%', width: 90}, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropModal({
  open,
  src,
  aspect = 16 / 9,
  onCancel,
  onCropDone
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const {naturalWidth, naturalHeight} = e.currentTarget;
      setCrop(centerAspectCrop(naturalWidth, naturalHeight, aspect));
    },
    [aspect]
  );

  const handleConfirm = useCallback(async () => {
    const image = imgRef.current;
    if (!image || !completedCrop) return;

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = 1280;
    canvas.height = 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      blob => {
        if (blob) onCropDone(blob);
      },
      'image/jpeg',
      0.92
    );
  }, [completedCrop, onCropDone]);

  return (
    <Modal open={open} title="Crop Image" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Adjust the crop area. All product images are saved at 16:9 ratio for
          consistency.
        </p>

        <div className="flex justify-center max-h-[60vh] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            aspect={aspect}
            minWidth={50}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-w-full"
            />
          </ReactCrop>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#2d4a35] hover:bg-[#24402c]"
            onClick={handleConfirm}
          >
            Use this crop
          </Button>
        </div>
      </div>
    </Modal>
  );
}
