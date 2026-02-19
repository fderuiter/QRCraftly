import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { INPUT_CLASSES, TEXT_AREA_CLASSES, SELECT_CLASSES } from './styles';
import { CharCount } from '../CharCount';

type FieldSize = 'sm' | 'xs';

interface BaseFieldProps {
  label: string;
  id: string;
  size?: FieldSize;
  className?: string; // wrapper className
  labelClassName?: string; // optional override
}

const getLabelClass = (size: FieldSize, customClass?: string) => {
  if (customClass) return customClass;
  if (size === 'xs') {
    return "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";
  }
  return "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
};

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement>, BaseFieldProps {
  showPasswordToggle?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  id,
  size = 'sm',
  className,
  labelClassName,
  showPasswordToggle,
  type = 'text',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  // If toggle is enabled, effective type switches between text and password.
  // Otherwise, use the provided type.
  const effectiveType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={className}>
      <label htmlFor={id} className={getLabelClass(size, labelClassName)}>{label}</label>
      <div className={showPasswordToggle ? "relative" : ""}>
        <input
          id={id}
          type={effectiveType}
          className={`${INPUT_CLASSES} ${showPasswordToggle ? 'pr-10' : ''}`}
          {...props}
        />
        {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        )}
      </div>
    </div>
  );
};

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseFieldProps {
  showCharCount?: boolean;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  id,
  size = 'sm',
  className,
  labelClassName,
  showCharCount,
  maxLength,
  value,
  ...props
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className={getLabelClass(size, labelClassName)}>{label}</label>
      <textarea
        id={id}
        maxLength={maxLength}
        className={TEXT_AREA_CLASSES}
        value={value}
        {...props}
      />
      {showCharCount && maxLength && (
        <CharCount current={String(value || '').length} max={maxLength} />
      )}
    </div>
  );
};

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement>, BaseFieldProps {}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  id,
  size = 'sm',
  className,
  labelClassName,
  children,
  ...props
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className={getLabelClass(size, labelClassName)}>{label}</label>
      <select
        id={id}
        className={SELECT_CLASSES}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};
