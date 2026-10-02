/** Properties for {@link Progress}. */
interface ProgressProps {
  /** Current value. Omit for an indeterminate progress indicator (work of unknown length). */
  value?: number;
  /** Maximum value (default 100). */
  max?: number;
  /** Accessible name. Use `labelledBy` instead when a visible label exists. */
  label?: string;
  /** Id of the visible element that names the indicator. */
  labelledBy?: string;
  /** `linear` (default) bar or `ring`. */
  variant?: 'linear' | 'ring';
  /** Bar height or ring diameter. */
  size?: 'sm' | 'md' | 'lg';
  /** Extra layout classes (width, margins). */
  className?: string;
}

const BAR_HEIGHT = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3' } as const;
const RING_SIZE = { sm: 'size-6', md: 'size-10', lg: 'size-16' } as const;
const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Progress indicator with `role="progressbar"`: a linear bar or a ring, determinate when
 * `value` is set (with `aria-valuenow`/`aria-valuemin`/`aria-valuemax`) and indeterminate
 * otherwise. It always needs an accessible name (`label` or `labelledBy`). The fill moves
 * smoothly when motion is allowed; the indeterminate state pulses or spins only then.
 * @param props - Progress properties.
 * @returns The progress indicator.
 */
export function Progress({ value, max = 100, label, labelledBy, variant = 'linear', size = 'md', className = '' }: ProgressProps) {
  const determinate = typeof value === 'number' && max > 0;
  const fraction = determinate ? Math.min(1, Math.max(0, value / max)) : 0;
  const a11y = {
    role: 'progressbar',
    'aria-label': label,
    'aria-labelledby': labelledBy,
    'aria-valuemin': determinate ? 0 : undefined,
    'aria-valuemax': determinate ? max : undefined,
    'aria-valuenow': determinate ? value : undefined,
  };

  if (variant === 'ring') {
    return (
      <div {...a11y} className={`${RING_SIZE[size]} ${determinate ? '' : 'motion-safe:animate-spin'} ${className}`.trim()}>
        <svg viewBox="0 0 40 40" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="20" cy="20" r={RING_RADIUS} fill="none" strokeWidth="4" className="stroke-line" />
          <circle
            cx="20"
            cy="20"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - (determinate ? fraction : 0.25))}
            className="stroke-accent motion-safe:transition-[stroke-dashoffset] motion-safe:duration-(--duration-base)"
          />
        </svg>
      </div>
    );
  }

  return (
    <div {...a11y} className={`w-full overflow-hidden rounded-full bg-line ${BAR_HEIGHT[size]} ${className}`.trim()}>
      <div
        className={`h-full rounded-full bg-accent ${determinate ? 'motion-safe:transition-[width] motion-safe:duration-(--duration-base)' : 'w-1/3 motion-safe:animate-pulse'}`}
        style={determinate ? { width: `${fraction * 100}%` } : undefined}
      />
    </div>
  );
}
