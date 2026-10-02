/** Properties for {@link Skeleton}. */
interface SkeletonProps {
  /**
   * Size classes that match the final layout, so nothing shifts when the content arrives
   * (for example `h-64` for a panel or `h-4 w-32` for a line of text).
   */
  className?: string;
  /** Corner radius role: `block` for panels and cards, `text` for a line, `circle` for avatars and icons. */
  shape?: 'block' | 'text' | 'circle';
}

const SHAPE_CLASSES = {
  block: 'rounded-xl',
  text: 'rounded-md',
  circle: 'rounded-full',
} as const;

/**
 * Loading placeholder with the dimensions of the content it stands in for. It pulses only
 * when motion is allowed and is hidden from assistive technology; announce the loading state
 * on the region that loads (for example `aria-busy`) instead.
 * @param props - Skeleton properties.
 * @param props.className - Size classes matching the final layout.
 * @param props.shape - Corner radius role.
 * @returns The placeholder.
 */
export function Skeleton({ className = '', shape = 'block' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`bg-surface-hover motion-safe:animate-pulse ${SHAPE_CLASSES[shape]} ${className}`.trim()}
    />
  );
}
