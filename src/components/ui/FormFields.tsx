import React, { useId } from "react";
import { TEXT_AREA_CLASSES, SELECT_CLASSES, ERROR_INPUT_CLASSES, mergeClasses } from "./styles";
import { combineIds } from "../../utils/a11y";
import { FieldWrapper, BaseFieldProps } from "./FieldWrapper";
/**
 *
 */
export { TextField } from "./TextField";

/**
 *
 */
interface TextAreaFieldProps
  extends
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id">,
    BaseFieldProps {
  /**
   *
   */
  showCharCount?: boolean;
}

/**
 *
 * @param root0
 * @param root0.label
 * @param root0.contextualLabel
 * @param root0.id
 * @param root0.className
 * @param root0.inputClassName
 * @param root0.labelClassName
 * @param root0.showCharCount
 * @param root0.maxLength
 * @param root0.value
 * @param root0.error
 * @param root0.description
 * @param root0."aria-describedby"
 */
export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  contextualLabel,
  id,
  className,
  inputClassName,
  labelClassName,
  showCharCount,
  maxLength,
  value,
  error,
  description,
  "aria-describedby": ariaDescribedby,
  ...props
}) => {
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
      <textarea
        id={inputId}
        maxLength={maxLength}
        className={mergeClasses(
          TEXT_AREA_CLASSES,
          error && ERROR_INPUT_CLASSES,
          inputClassName,
          className
        )}
        value={value}
        aria-invalid={!!error}
        {...props}
        aria-describedby={describedBy}
      />
    </FieldWrapper>
  );
};

// Select element also has a 'size' attribute (number of visible options), so we omit it here too.
/**
 *
 *
 */
interface SelectFieldProps
  extends
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size" | "id">,
    BaseFieldProps {}

/**
 *
 * @param root0
 * @param root0.label
 * @param root0.contextualLabel
 * @param root0.id
 * @param root0.className
 * @param root0.inputClassName
 * @param root0.labelClassName
 * @param root0.children
 * @param root0.error
 * @param root0.description
 * @param root0."aria-describedby"
 */
export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  contextualLabel,
  id,
  className,
  inputClassName,
  labelClassName,
  children,
  error,
  description,
  "aria-describedby": ariaDescribedby,
  ...props
}) => {
  const defaultId = useId();
  const inputId = id || defaultId;
  const errorId = error ? `${inputId}-error` : undefined;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const describedBy = combineIds(descriptionId, errorId, ariaDescribedby);

  return (
    <FieldWrapper
      inputId={inputId}
      label={label}
      contextualLabel={contextualLabel}
      className={className}
      labelClassName={labelClassName}
      error={error}
      errorId={errorId}
      description={description}
      descriptionId={descriptionId}
    >
      <select 
        id={inputId} 
        className={mergeClasses(
          SELECT_CLASSES,
          error && ERROR_INPUT_CLASSES,
          inputClassName,
          className
        )} 
        aria-invalid={!!error}
        {...props}
        aria-describedby={describedBy}
      >
        {children}
      </select>
    </FieldWrapper>
  );
};

/**
 *
 *
 */
interface CheckboxFieldProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "type">,
    BaseFieldProps {}

/**
 *
 * @param root0
 * @param root0.label
 * @param root0.contextualLabel
 * @param root0.id
 * @param root0.className
 * @param root0.labelClassName
 * @param root0.error
 * @param root0.description
 * @param root0."aria-describedby"
 */
export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  contextualLabel,
  id,
  className,
  labelClassName,
  error,
  description,
  "aria-describedby": ariaDescribedby,
  ...props
}) => {
  const defaultId = useId();
  const inputId = id || defaultId;
  const errorId = error ? `${inputId}-error` : undefined;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const describedBy = combineIds(descriptionId, errorId, ariaDescribedby);

  return (
    <FieldWrapper
      inputId={inputId}
      label={label}
      contextualLabel={contextualLabel}
      className={className}
      labelClassName={labelClassName}
      error={error}
      errorId={errorId}
      description={description}
      descriptionId={descriptionId}
      isCheckbox
    >
      <input
        id={inputId}
        type="checkbox"
        className="rounded border-slate-300 bg-white text-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-teal-700"
        aria-invalid={!!error}
        {...props}
        aria-describedby={describedBy}
      />
    </FieldWrapper>
  );
};
