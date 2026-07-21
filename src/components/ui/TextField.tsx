import React, { useState, forwardRef, useId } from 'react';
import { Button } from './Button';
import { Eye, EyeOff } from 'lucide-react';
import { CharCount } from '../CharCount';
import { combineIds } from '../../utils/a11y';

export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'id'> {
  label?: string;
  contextualLabel?: string;
  error?: string;
  showPasswordToggle?: boolean;
  showCharCount?: boolean;
  id?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className = '', label, contextualLabel, error, showPasswordToggle, showCharCount, type = 'text', id, maxLength, value, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const effectiveType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;
    
    const defaultId = useId();
    const inputId = id || defaultId;
    
    const errorId = error ? `${inputId}-error` : undefined;
    const charCountId = showCharCount && maxLength ? `${inputId}-char-count` : undefined;
    const describedBy = combineIds(errorId, charCountId);

    const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

    return (
      <div className={className}>
        {label && (
          <label htmlFor={inputId} className={labelClass}>
            {label}
            {contextualLabel && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal ml-2">
                ({contextualLabel})
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={effectiveType}
            maxLength={maxLength}
            value={value}
            className={`w-full bg-white dark:bg-slate-900 border ${error ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'} rounded-lg transition-all text-slate-700 dark:text-slate-100 text-sm px-3 py-2 ${showPasswordToggle ? 'pr-10' : ''}`}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            {...props}
          />
          {showPasswordToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 min-w-0 min-h-0 w-6 h-6 flex items-center justify-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          )}
        </div>
        {showCharCount && maxLength && (
          <CharCount id={charCountId} current={String(value || '').length} max={maxLength} />
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = 'TextField';
