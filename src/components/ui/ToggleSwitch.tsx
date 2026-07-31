import React from 'react';

/**
 *
 */
interface ToggleSwitchProps {
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
}

/**
 *
 * @param root0
 * @param root0.id
 * @param root0.label
 * @param root0.checked
 * @param root0.onChange
 * @param root0.srLabel
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  label,
  checked,
  onChange,
  srLabel = false,
}) => {
  return (
    <div className="flex items-center">
      <label htmlFor={id} className="cursor-pointer inline-flex items-center relative">
        {srLabel && <span className="sr-only">{label}</span>}
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="after:absolute after:bg-white after:border after:border-gray-300 after:content-[''] after:h-4 after:left-[2px] after:rounded-full after:top-[2px] after:transition-all after:w-4 bg-slate-200 dark:bg-slate-700 dark:border-gray-600 h-5 peer peer-checked:after:border-white peer-checked:after:translate-x-full peer-checked:bg-teal-700 rounded-full w-9"></div>
        {!srLabel && <span className="dark:text-slate-300 font-medium ml-3 text-slate-700 text-sm">{label}</span>}
      </label>
    </div>
  );
};
