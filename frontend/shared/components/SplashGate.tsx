'use client';

import FrameLoader from './FrameLoader';
import {useSplash} from '../hooks/useSplash';

export default function SplashGate({
  ready,
  minMs = 2000
}: {
  ready: boolean;
  minMs?: number;
}) {
  const show = useSplash(ready, minMs);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white">
      <FrameLoader size={160} />
    </div>
  );
}