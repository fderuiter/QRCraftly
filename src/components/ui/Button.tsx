import { AnchorHTMLAttributes, ButtonHTMLAttributes, forwardRef } from 'react';
import { isDangerousUrl } from '@/utils/security';

type ButtonVariant = 'primary' | 'secondary' | 'error' | 'ghost' | 'outline' | 'menuitem' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'none';

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  /**
   * Toggle/selection state. When provided, the button exposes `aria-pressed` and, when
   * true, swaps the variant colours for a selected style defined for both light and dark
   * themes (thicker ring plus colour, so selection is not conveyed by colour alone).
   * Use this instead of passing selected-state border classes through `className`,
   * which lose to the variant's `dark:` classes.
   */
  pressed?: boolean;
}

/**
 * Selected-state styles shared by every variant. Border and ring colours meet the
 * 3:1 non-text contrast minimum against both the light and dark surfaces.
 */
const PRESSED_STYLES =
  'bg-accent-soft border border-accent-strong ring-1 ring-accent-strong text-accent-strong font-semibold hover:bg-surface-hover';

/**
 * Builds the class list shared by `Button` and `ButtonLink`.
 * @param options Variant, size, width, selection state and extra classes.
 * @returns The combined class string.
 */
function buttonClassName({ variant = 'secondary', size = 'md', fullWidth = false, pressed, className = '' }: ButtonStyleProps & { pressed?: boolean; className?: string }): string {
  const baseStyles = 'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 font-medium inline-flex items-center justify-center transition-colors';

  let variantStyles = '';
  let sizeStyles = '';

  switch (variant) {
    case 'primary':
      variantStyles = 'bg-action hover:bg-action-hover shadow-raised text-on-action';
      break;
    case 'secondary':
      variantStyles = 'bg-accent-soft border border-accent-line hover:bg-surface-hover text-accent';
      break;
    case 'error':
      variantStyles = 'bg-danger-action text-on-action hover:bg-danger-action-hover shadow-raised';
      break;
    case 'outline':
      variantStyles = 'bg-surface-raised border border-line hover:bg-surface-hover text-fg-soft';
      break;
    case 'ghost':
      variantStyles = 'bg-transparent hover:bg-surface-hover text-fg-muted';
      break;
    case 'menuitem':
      variantStyles = 'bg-transparent hover:bg-surface-hover text-fg-soft';
      break;
    case 'icon':
      variantStyles = 'bg-transparent hover:bg-surface-hover hover:text-fg text-fg-muted';
      break;
  }

  if (pressed === true) {
    variantStyles = PRESSED_STYLES;
  }

  switch (size) {
    case 'sm':
      sizeStyles = 'px-3 py-1.5 rounded-lg text-sm';
      break;
    case 'md':
      sizeStyles = 'gap-2 px-4 py-2.5 rounded-xl text-sm'; // Adding gap for icons commonly used
      break;
    case 'lg':
      sizeStyles = 'gap-2 px-6 py-3 rounded-xl text-base';
      break;
    case 'icon':
      sizeStyles = 'p-2 rounded-xl';
      break;
    case 'none':
      sizeStyles = '';
      break;
  }

  // override size styles for menuitem
  if (variant === 'menuitem') {
    sizeStyles = 'flex gap-2 items-center px-4 py-2.5 rounded-none text-left text-sm w-full';
  }

  const widthStyles = fullWidth ? 'w-full' : '';

  return `${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyles} ${className}`.trim();
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'secondary', size = 'md', fullWidth = false, type = 'button', pressed, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, fullWidth, pressed, className })}
      aria-pressed={pressed}
      {...props}
    />
  )
);

Button.displayName = 'Button';

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement>, ButtonStyleProps {
  href: string;
}

/**
 * A link styled as a `Button`, for navigation that should look like an action
 * (for example "Go Home" or "View on GitHub"). It renders a real `<a>` so it keeps
 * link semantics, middle-click and prefetching. Unsafe URLs render nothing.
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className = '', variant = 'secondary', size = 'md', fullWidth = false, href, children, ...props }, ref) => {
    if (!isDangerousUrl(href)) {
      return (
        <a ref={ref} href={href} className={buttonClassName({ variant, size, fullWidth, className })} {...props}>
          {children}
        </a>
      );
    }
    return null;
  }
);

ButtonLink.displayName = 'ButtonLink';
