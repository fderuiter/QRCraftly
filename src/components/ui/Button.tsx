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
}

/**
 *
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'secondary', size = 'md', fullWidth = false, type = 'button', ...props }, ref) => {
    
    let baseStyles = 'disabled:cursor-not-allowed disabled:opacity-50 font-medium inline-flex items-center justify-center transition-colors';
    
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
      <button ref={ref} type={type} className={combinedClassName} {...props} />
    );
  }
);

Button.displayName = 'Button';
