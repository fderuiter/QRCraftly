import React, { useId } from "react";
import { TEXT_AREA_CLASSES, SELECT_CLASSES } from "./styles";
import { combineIds } from "../../utils/a11y";
import { FieldWrapper, BaseFieldProps } from "../ui/FieldWrapper";
export { TextField } from "../ui/TextField";

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
    <FieldWrapper
      inputId={inputId}
      label={label}
      contextualLabel={contextualLabel}
      className={className}
      labelClassName={labelClassName}
      error={error}
      errorId={errorId}
      isCheckbox
    >
      <input
        id={inputId}
        type="checkbox"
        className="rounded text-teal-700 dark:text-teal-600 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...props}
      />
    </FieldWrapper>
  );
};
