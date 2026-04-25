'use client';
import {useEffect} from 'react';
import {waveform} from 'ldrs';

export default function Loading() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      waveform.register();
    }
  }, []);

  return (
    <div className="h-screen flex justify-center items-center">
      <l-waveform size="60" speed="1.0" color="green" stroke={8}></l-waveform>
    </div>
  );
}