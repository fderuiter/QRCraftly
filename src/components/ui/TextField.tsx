import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { CharCount } from "../CharCount";

export type FieldSize = "sm" | "xs";

export interface BaseFieldProps {
  label: string;
  id: string; // explicitly required
  fieldSize?: FieldSize; // renamed from 'size' to avoid conflict with HTML input 'size'
  className?: string; // wrapper className
  labelClassName?: string; // optional override
}

export const getLabelClass = (size: FieldSize, customClass?: string) => {
  if (customClass) return customClass;
  if (size === "xs") {
    return "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";
  }
  return "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
};

export interface FieldWrapperProps extends BaseFieldProps {
  showCharCount?: boolean;
  maxLength?: number;
  value?: string | number | readonly string[];
  children: React.ReactNode;
}

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  id,
  label,
  fieldSize = "xs",
  className,
  labelClassName,
  showCharCount,
  maxLength,
  value,
  children,
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className={getLabelClass(fieldSize, labelClassName)}>
        {label}
      </label>
      {children}
      {showCharCount && maxLength && (
        <CharCount current={String(value || "").length} max={maxLength} />
      )}
    </div>
  );
};

export interface TextFieldProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "id">,
    BaseFieldProps {
  showPasswordToggle?: boolean;
  showCharCount?: boolean;
}

const BASE_INPUT_CLASSES =
  "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 focus:border-teal-500 outline-none transition-all text-slate-700 dark:text-slate-100 text-sm focus-visible:ring-2 focus-visible:ring-teal-500";
const INPUT_CLASSES = `${BASE_INPUT_CLASSES} px-4 py-2 placeholder-slate-400 font-mono`;

export const TextField: React.FC<TextFieldProps> = ({
  label,
  id,
  fieldSize = "xs",
  className,
  labelClassName,
  showPasswordToggle,
  showCharCount,
  type = "text",
  maxLength,
  value,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const effectiveType = showPasswordToggle
    ? showPassword
      ? "text"
      : "password"
    : type;

  return (
    <FieldWrapper
      id={id}
      label={label}
      fieldSize={fieldSize}
      className={className}
      labelClassName={labelClassName}
      showCharCount={showCharCount}
      maxLength={maxLength}
      value={value}
    >
      <div className={showPasswordToggle ? "relative" : ""}>
        <input
          id={id}
          type={effectiveType}
          maxLength={maxLength}
          value={value}
          className={`${INPUT_CLASSES} ${showPasswordToggle ? "pr-10" : ""}`}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </FieldWrapper>
  );
};
