import { ButtonHTMLAttributes, forwardRef } from 'react';

/**
 *
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   *
   */
  variant?: 'primary' | 'secondary' | 'error' | 'ghost' | 'outline' | 'menuitem' | 'icon';
  /**
   *
   */
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'none';
  /**
   *
   */
  fullWidth?: boolean;
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
  'bg-teal-50 border border-teal-700 ring-1 ring-teal-700 text-teal-800 font-semibold hover:bg-teal-100 dark:bg-teal-950 dark:border-teal-300 dark:ring-teal-300 dark:text-teal-100 dark:hover:bg-teal-900';

/**
 *
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'secondary', size = 'md', fullWidth = false, type = 'button', pressed, ...props }, ref) => {
    
    const baseStyles = 'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 font-medium inline-flex items-center justify-center transition-colors';
    
    let variantStyles = '';
    let sizeStyles = '';

    switch (variant) {
      case 'primary':
        variantStyles = 'bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 dark:shadow-teal-900/40 hover:bg-teal-800 shadow-lg shadow-teal-900/10 text-white';
        break;
      case 'secondary':
        variantStyles = 'bg-teal-50 border border-teal-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-teal-400 hover:bg-teal-100 text-teal-700';
        break;
      case 'error':
        variantStyles = 'bg-rose-700 text-white hover:bg-rose-800 shadow-lg shadow-rose-900/10 dark:bg-rose-700 dark:hover:bg-rose-600 dark:shadow-rose-950/40';
        break;
      case 'outline':
        variantStyles = 'bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700/50 dark:text-slate-200 hover:bg-slate-50 text-slate-700';
        break;
      case 'ghost':
        variantStyles = 'bg-transparent dark:hover:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 text-slate-500';
        break;
      case 'menuitem':
        variantStyles = 'bg-transparent dark:hover:bg-slate-700/50 dark:text-slate-200 hover:bg-slate-50 text-slate-700';
        break;
      case 'icon':
        variantStyles = 'bg-transparent dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-slate-500';
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

    const combinedClassName = `${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyles} ${className}`.trim();

    return (
      <button ref={ref} type={type} className={combinedClassName} aria-pressed={pressed} {...props} />
    );
  }
);

Button.displayName = 'Button';
