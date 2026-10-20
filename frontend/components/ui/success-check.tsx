import Image from 'next/image';
import {cn} from '@/lib/utils';

interface SuccessCheckProps {
  size?: number;
  className?: string;
}

export default function SuccessCheck({size = 80, className}: SuccessCheckProps) {
  return (
    <div className={cn('mx-auto flex items-center justify-center', className)}>
      <Image
        src="/assets/loading/frame_03.png"
        alt="Success"
        width={size}
        height={size}
        className="object-contain"
      />
    </div>
  );
}