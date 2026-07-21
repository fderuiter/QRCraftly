import React, { useId } from "react";
import { TEXT_AREA_CLASSES, SELECT_CLASSES } from "./styles";
import { CharCount } from "../CharCount";
import { combineIds } from "../../utils/a11y";
export { TextField } from "../ui/TextField";

interface BaseFieldProps {
  label: string;
  contextualLabel?: string;
  id?: string;
  className?: string; // wrapper className
  labelClassName?: string; // optional override
  error?: string;
}

const getLabelClass = (customClass?: string) => {
  if (customClass) return customClass;
  return "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
};

// Omit 'size' to prevent conflict, and 'id' to ensure our required 'id' overrides the optional one cleanly (though TS usually handles required overriding optional, explicit omit is safer for strict configs)
interface FieldWrapperProps extends BaseFieldProps {
  showCharCount?: boolean;
  maxLength?: number;
  value?: string | number | readonly string[];
  children: React.ReactNode;
  inputId: string;
  errorId?: string;
  charCountId?: string;
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({
  inputId,
  label,
  contextualLabel,
  className,
  labelClassName,
  showCharCount,
  maxLength,
  value,
  children,
  error,
  errorId,
  charCountId,
}) => {
  return (
    <div className={className}>
      <label htmlFor={inputId} className={getLabelClass(labelClassName)}>
        {label}
        {contextualLabel && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal ml-2">
            ({contextualLabel})
          </span>
        )}
      </label>
      {children}
      {showCharCount && maxLength && (
        <CharCount id={charCountId} current={String(value || "").length} max={maxLength} />
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
};


interface TextAreaFieldProps
  extends
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id">,
    BaseFieldProps {
  showCharCount?: boolean;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  contextualLabel,
  id,
  className,
  labelClassName,
  showCharCount,
  maxLength,
  value,
  error,
  ...props
}) => {
  const defaultId = useId();
  const inputId = id || defaultId;
  const errorId = error ? `${inputId}-error` : undefined;
  const charCountId = showCharCount && maxLength ? `${inputId}-char-count` : undefined;
  const describedBy = combineIds(errorId, charCountId);

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
    >
      <textarea
        id={inputId}
        maxLength={maxLength}
        className={TEXT_AREA_CLASSES}
        value={value}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...props}
      />
    </FieldWrapper>
  );
};

// Select element also has a 'size' attribute (number of visible options), so we omit it here too.
interface SelectFieldProps
  extends
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size" | "id">,
    BaseFieldProps {}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  contextualLabel,
  id,
  className,
  labelClassName,
  children,
  error,
  ...props
}) => {
  const defaultId = useId();
  const inputId = id || defaultId;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = combineIds(errorId);

  return (
    <FieldWrapper
      inputId={inputId}
      label={label}
      contextualLabel={contextualLabel}
      className={className}
      labelClassName={labelClassName}
      error={error}
      errorId={errorId}
    >
      <select 
        id={inputId} 
        className={SELECT_CLASSES} 
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
};

interface CheckboxFieldProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "type">,
    BaseFieldProps {}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  contextualLabel,
  id,
  className,
  labelClassName,
  error,
  ...props
}) => {
  const defaultId = useId();
  const inputId = id || defaultId;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = combineIds(errorId);

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={`flex items-center gap-2 cursor-pointer ${getLabelClass(labelClassName).replace('mb-1', '')}`}
      >
        <input
          id={inputId}
          type="checkbox"
          className="rounded text-teal-700 dark:text-teal-600 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        />
        <span>{label}</span>
        {contextualLabel && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            ({contextualLabel})
          </span>
        )}
      </label>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
};
