import React from "react";
import { CharCount } from "../CharCount";

/**
 *
 */
export interface BaseFieldProps {
  /**
   *
   */
  label?: string;
  /**
   *
   */
  contextualLabel?: string;
  /**
   *
   */
  id?: string;
  /**
   *
   */
  className?: string; // wrapper className
  /**
   *
   */
  inputClassName?: string; // input element className override
  /**
   *
   */
  labelClassName?: string; // optional override
  /**
   *
   */
  error?: string;
  /**
   *
   */
  description?: string;
}

const getLabelClass = (customClass?: string) => {
  if (customClass) return customClass;
  return "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
};

/**
 *
 */
interface FieldWrapperProps extends BaseFieldProps {
  /**
   *
   */
  showCharCount?: boolean;
  /**
   *
   */
  maxLength?: number;
  /**
   *
   */
  value?: string | number | readonly string[];
  /**
   *
   */
  children: React.ReactNode;
  /**
   *
   */
  inputId: string;
  /**
   *
   */
  errorId?: string;
  /**
   *
   */
  charCountId?: string;
  /**
   *
   */
  isCheckbox?: boolean;
  /**
   *
   */
  descriptionId?: string;
}

/**
 *
 * @param root0
 * @param root0.inputId
 * @param root0.label
 * @param root0.contextualLabel
 * @param root0.className
 * @param root0.labelClassName
 * @param root0.showCharCount
 * @param root0.maxLength
 * @param root0.value
 * @param root0.children
 * @param root0.error
 * @param root0.errorId
 * @param root0.charCountId
 * @param root0.isCheckbox
 * @param root0.description
 * @param root0.descriptionId
 */
export const FieldWrapper: React.FC<FieldWrapperProps> = ({
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
  isCheckbox,
  description,
  descriptionId,
}) => {
  if (isCheckbox) {
    return (
      <div className={className}>
        <label
          htmlFor={inputId}
          className={`flex cursor-pointer items-center gap-2 ${getLabelClass(labelClassName).replace("mb-1", "")}`}
        >
          {children}
          {label && <span>{label}</span>}
          {contextualLabel && (
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              ({contextualLabel})
            </span>
          )}
        </label>
        {description && (
          <p id={descriptionId} className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={getLabelClass(labelClassName)}>
          {label}
          {contextualLabel && (
            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
              ({contextualLabel})
            </span>
          )}
        </label>
      )}
      {children}
      {description && (
        <p id={descriptionId} className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          {description}
        </p>
      )}
      {showCharCount && maxLength && (
        <CharCount id={charCountId} current={String(value !== undefined && value !== null ? value : "").length} max={maxLength} />
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
};
