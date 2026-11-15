import FrameLoader from './FrameLoader';

/**
 * In-page loading state: the FrameLoader centered inside whatever box it
 * replaces (card, list, dropdown). Keeps a minimum height so the layout does
 * not jump, and announces `label` to screen readers (the frames are hidden).
 */
export default function SectionLoader({
  label = 'Loading',
  size = 96,
  className = 'py-10'
}: {
  label?: string;
  size?: number;
  /** Padding / min-height / card styles of the box being replaced. */
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center justify-center ${className}`}>
      <FrameLoader size={size} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
