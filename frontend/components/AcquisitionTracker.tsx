'use client';

import {useEffect} from 'react';
import {captureAcquisition} from '@/lib/acquisition';

/** Remembers where this visitor came from on their first page load. Renders nothing. */
export function AcquisitionTracker() {
  useEffect(() => {
    captureAcquisition();
  }, []);
  return null;
}
