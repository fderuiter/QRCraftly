import React, { useState, forwardRef, useId } from 'react';
import { Button } from './Button';
import { Eye, EyeOff } from 'lucide-react';
import { combineIds } from '../../utils/a11y';
import { FieldWrapper, BaseFieldProps } from './FieldWrapper';
import { TEXT_FIELD_CLASSES, ERROR_INPUT_CLASSES, mergeClasses } from './styles';

/**
 *
 */
interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'id'>, BaseFieldProps {
  /**
   *
   */
  showPasswordToggle?: boolean;
  /**
   *
   */
  showCharCount?: boolean;
}

/**
 *
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className = '', inputClassName = '', label, contextualLabel, labelClassName, error, description, showPasswordToggle, showCharCount, type = 'text', id, maxLength, value, 'aria-describedby': ariaDescribedby, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const effectiveType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;
    
    const defaultId = useId();
    const inputId = id || defaultId;
    
    const errorId = error ? `${inputId}-error` : undefined;
    const charCountId = showCharCount && maxLength ? `${inputId}-char-count` : undefined;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const describedBy = combineIds(descriptionId, errorId, charCountId, ariaDescribedby);

    return (
      <FieldWrapper
        inputId={inputId}
        label={label}
        contextualLabel={contextualLabel}
        className={className}
        labelClassName={labelClassName}
        showCharCount={showCharCount}
        maxLength={maxLength}
        value={value}
        error={error}
        errorId={errorId}
        charCountId={charCountId}
        description={description}
        descriptionId={descriptionId}
      >
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={effectiveType}
            maxLength={maxLength}
            value={value}
            className={mergeClasses(
              TEXT_FIELD_CLASSES,
              error && ERROR_INPUT_CLASSES,
              showPasswordToggle && 'pr-10',
              inputClassName,
              className
            )}
            aria-invalid={!!error}
            {...props}
            aria-describedby={describedBy}
          />
          {showPasswordToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-1/2 right-2 flex size-6 min-h-0 min-w-0 -translate-y-1/2 items-center justify-center rounded-full p-1 text-slate-400"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          )}
        </div>
      </FieldWrapper>
    );
  }
);

TextField.displayName = 'TextField';
