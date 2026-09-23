import FrameLoader from '@/shared/components/FrameLoader';

export default function Loading() {
  return (
    <div className="h-screen flex justify-center items-center">
      <FrameLoader size={160} />
    </div>
  );
}