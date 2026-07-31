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
}) => {
  if (isCheckbox) {
    return (
      <div className={className}>
        <label
          htmlFor={inputId}
          className={`cursor-pointer flex gap-2 items-center ${getLabelClass(labelClassName).replace("mb-1", "")}`}
        >
          {children}
          {label && <span>{label}</span>}
          {contextualLabel && (
            <span className="dark:text-slate-400 font-normal text-slate-500 text-xs">
              ({contextualLabel})
            </span>
          )}
        </label>
        {error && (
          <p id={errorId} role="alert" className="dark:text-rose-400 mt-1 text-rose-700 text-xs">
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
            <span className="dark:text-slate-400 font-normal ml-2 text-slate-500 text-xs">
              ({contextualLabel})
            </span>
          )}
        </label>
      )}
      {children}
      {showCharCount && maxLength && (
        <CharCount id={charCountId} current={String(value !== undefined && value !== null ? value : "").length} max={maxLength} />
      )}
      {error && (
        <p id={errorId} role="alert" className="dark:text-rose-400 mt-1 text-rose-700 text-xs">
          {error}
        </p>
      )}
    </div>
  );
};
