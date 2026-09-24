'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';

const DEFAULT_FRAMES = [
  'frame_01.png',
  'frame_02.png',
  'frame_03.png',
  'frame_04.png'
];

const FRAME_MS = 450;
const FADE_MS = 300;

export default function FrameLoader({
  size = 160,
  frames = DEFAULT_FRAMES,
  framesDir = '/assets/loading',
  intervalMs = FRAME_MS,
  className = ''
}: {
  size?: number;
  frames?: string[];
  framesDir?: string;
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (frames.length < 1) return;
    const id = setInterval(
      () => setIndex(i => (i + 1) % frames.length),
      intervalMs
    );
    return () => clearInterval(id);
  }, [frames.length, intervalMs]);

  return (
    <div
      className={'relative ' + className}
      style={{
        width: size,
        height: Math.round(size * (295 / 254))
      }}
      aria-hidden
    >
      {frames.map((src, i) => (
        <Image
          key={`${framesDir}/${src}`}
          src={`${framesDir}/${src}`}
          alt=""
          fill
          priority
          sizes={`${size}px`}
          draggable={false}
          style={{
            objectFit: 'contain',
            opacity: i === index ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
            pointerEvents: 'none'
          }}
        />
      ))}
    </div>
  );
}