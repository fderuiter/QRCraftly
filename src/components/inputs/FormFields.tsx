import React from "react";
import { TEXT_AREA_CLASSES, SELECT_CLASSES } from "./styles";
import { FieldWrapper, getLabelClass, BaseFieldProps, FieldSize } from "../ui/TextField";
export { TextField } from "../ui/TextField";
export type { TextFieldProps } from "../ui/TextField";

interface TextAreaFieldProps
  extends
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id">,
    BaseFieldProps {
  showCharCount?: boolean;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  id,
  fieldSize = "xs",
  className,
  labelClassName,
  showCharCount,
  maxLength,
  value,
  ...props
}) => {
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
      <textarea
        id={id}
        maxLength={maxLength}
        className={TEXT_AREA_CLASSES}
        value={value}
        {...props}
      />
    </FieldWrapper>
  );
};

interface SelectFieldProps
  extends
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size" | "id">,
    BaseFieldProps {}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  id,
  fieldSize = "xs",
  className,
  labelClassName,
  children,
  ...props
}) => {
  return (
    <FieldWrapper
      id={id}
      label={label}
      fieldSize={fieldSize}
      className={className}
      labelClassName={labelClassName}
    >
      <select id={id} className={SELECT_CLASSES} {...props}>
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
  id,
  fieldSize = "xs",
  className,
  labelClassName,
  ...props
}) => {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`flex items-center gap-2 cursor-pointer ${getLabelClass(fieldSize, labelClassName).replace('mb-1', '')} ${fieldSize === 'xs' ? 'font-sans' : ''}`}
      >
        <input
          id={id}
          type="checkbox"
          className="rounded text-teal-700 dark:text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          {...props}
        />
        <span>{label}</span>
      </label>
    </div>
  );
};
