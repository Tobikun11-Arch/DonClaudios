'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';

const FRAMES = [
  'frame_01.png',
  'frame_02.png',
  'frame_03.png',
  'frame_04.png'
];

const FRAME_MS = 450;
const FADE_MS = 300;

export default function FrameLoader({
  size = 160,
  className = ''
}: {
  size?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % FRAMES.length), FRAME_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={'relative ' + className}
      style={{
        width: size,
        height: Math.round(size * (295 / 254))
      }}
      aria-hidden
    >
      {FRAMES.map((src, i) => (
        <Image
          key={src}
          src={`/assets/loading/${src}`}
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