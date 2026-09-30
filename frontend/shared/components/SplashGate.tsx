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

  // `m-0` is load-bearing: callers render this inside `space-y-*` containers
  // (e.g. the owner dashboard's `space-y-5` wrapper), whose sibling margins
  // would otherwise land on this element. A `fixed inset-0` box has its used
  // height reduced by its own margins, so a leaked 20px bottom margin left a
  // strip of the dashboard visible below the splash.
  return (
    <div className="fixed inset-0 z-[200] m-0 flex items-center justify-center bg-white">
      <FrameLoader size={160} />
    </div>
  );
}