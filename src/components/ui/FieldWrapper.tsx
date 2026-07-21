import React, { useId } from "react";

import { combineIds } from "../../utils/a11y";
import { CharCount } from "../CharCount";

export function useFieldIds(id?: string, error?: string, showCharCount?: boolean, maxLength?: number) {
  const defaultId = useId();
  const inputId = id || defaultId;
  const errorId = error ? `${inputId}-error` : undefined;
  const charCountId = showCharCount && maxLength ? `${inputId}-char-count` : undefined;
  const describedBy = combineIds(errorId, charCountId);
  return { inputId, errorId, charCountId, describedBy };
}

export interface BaseFieldProps {
  label?: string;
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

export interface FieldWrapperProps extends BaseFieldProps {
  showCharCount?: boolean;
  maxLength?: number;
  value?: string | number | readonly string[];
  children: React.ReactNode;
  inputId: string;
  errorId?: string;
  charCountId?: string;
  isCheckbox?: boolean;
}

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
          className={`flex items-center gap-2 cursor-pointer ${getLabelClass(labelClassName).replace("mb-1", "")}`}
        >
          {children}
          {label && <span>{label}</span>}
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
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={getLabelClass(labelClassName)}>
          {label}
          {contextualLabel && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal ml-2">
              ({contextualLabel})
            </span>
          )}
        </label>
      )}
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
