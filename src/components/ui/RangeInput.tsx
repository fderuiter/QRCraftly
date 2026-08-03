import React from 'react';

/**
 * Helper component for range inputs to display current value.
 */
interface RangeInputProps {
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
  value: number;
  /**
   *
   */
  onChange: (value: number) => void;
  /**
   *
   */
  min: number;
  /**
   *
   */
  max: number;
  /**
   *
   */
  step: number;
  /**
   *
   */
  formatValue?: (value: number) => string;
}

/**
 *
 * @param root0
 * @param root0.id
 * @param root0.label
 * @param root0.value
 * @param root0.onChange
 * @param root0.min
 * @param root0.max
 * @param root0.step
 * @param root0.formatValue
 */
export const RangeInput: React.FC<RangeInputProps> = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  formatValue = (val) => val.toString(),
}) => (
  <div>
    <div className="mb-1 flex items-center justify-between">
      <label htmlFor={id} className="block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
        {formatValue(value)}
      </span>
    </div>
    <div className="-m-1 rounded-lg p-1">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={formatValue(value)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer rounded-lg accent-teal-700 dark:accent-teal-500"
      />
    </div>
  </div>
);
