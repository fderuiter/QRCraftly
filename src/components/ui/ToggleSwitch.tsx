import React from 'react';
import { announcePolitely } from '../../utils/a11y';

/**
 *
 */
interface ToggleSwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /**
   *
   */
  id: string;
  /**
   *
   */
  label: string;
  /**
   *
   */
  checked: boolean;
  /**
   *
   */
  onChange: (checked: boolean) => void;
  /**
   *
   */
  srLabel?: boolean;
  /**
   * Optional custom classes for the label text span
   */
  labelClassName?: string;
}

/**
 *
 * @param root0
 * @param root0.id
 * @param root0.label
 * @param root0.checked
 * @param root0.onChange
 * @param root0.srLabel
 * @param root0.labelClassName
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  label,
  checked,
  onChange,
  srLabel = false,
  labelClassName,
  ...rest
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked;
    onChange(newChecked);
    announcePolitely(`${label}: ${newChecked ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="flex items-center">
      <label htmlFor={id} className="relative inline-flex cursor-pointer items-center">
        {srLabel && <span className="sr-only">{label}</span>}
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          aria-checked={checked}
          onChange={handleChange}
          {...rest}
        />
        <div className="peer h-5 w-9 rounded-full bg-slate-600 peer-checked:bg-teal-700 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-600 peer-focus-visible:ring-offset-2 after:absolute after:top-[2px] after:left-[2px] after:size-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-slate-400 dark:peer-checked:bg-teal-600 dark:peer-focus-visible:ring-indigo-400 dark:peer-focus-visible:ring-offset-slate-900"></div>
        {!srLabel && (
          <span className={labelClassName ? `ml-3 ${labelClassName}` : "ml-3 text-sm font-medium text-slate-700 dark:text-slate-300"}>
            {label}
          </span>
        )}
      </label>
    </div>
  );
};
