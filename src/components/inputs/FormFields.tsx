import React, { } from "react";
import { TEXT_AREA_CLASSES, SELECT_CLASSES } from "./styles";
import { CharCount } from "../CharCount";
import { VisualSanityService } from "../../utils/visualSanityService";
export { TextField } from "../ui/TextField";

interface BaseFieldProps {
  label: string;
  contextualLabel?: string;
  id: string; // explicitly required
  className?: string; // wrapper className
  labelClassName?: string; // optional override
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
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({
  id,
  label,
  contextualLabel,
  className,
  labelClassName,
  showCharCount,
  maxLength,
  value,
  children,
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className={getLabelClass(labelClassName)}>
        {label}
        {contextualLabel && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal ml-2">
            ({contextualLabel})
          </span>
        )}
      </label>
      {children}
      {showCharCount && maxLength && (
        <CharCount current={VisualSanityService.countGraphemes(String(value || ""))} max={maxLength} />
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
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (maxLength && VisualSanityService.countGraphemes(e.target.value) > maxLength) {
      e.target.value = VisualSanityService.sliceByGraphemes(e.target.value, maxLength);
    }
    if (props.onChange) {
      props.onChange(e);
    }
  };

  return (
    <FieldWrapper
      id={id}
      label={label}
      contextualLabel={contextualLabel}
      className={className}
      labelClassName={labelClassName}
      showCharCount={showCharCount}
      maxLength={maxLength}
      value={value}
    >
      <textarea
        id={id}
        className={TEXT_AREA_CLASSES}
        value={value}
        {...props}
        onChange={handleChange}
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
  ...props
}) => {
  return (
    <FieldWrapper
      id={id}
      label={label}
      contextualLabel={contextualLabel}
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
  contextualLabel,
  id,
  className,
  labelClassName,
  ...props
}) => {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`flex items-center gap-2 cursor-pointer ${getLabelClass(labelClassName).replace('mb-1', '')}`}
      >
        <input
          id={id}
          type="checkbox"
          className="rounded text-teal-700 dark:text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          {...props}
        />
        <span>{label}</span>
        {contextualLabel && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            ({contextualLabel})
          </span>
        )}
      </label>
    </div>
  );
};
