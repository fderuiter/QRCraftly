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
    <div className="flex items-center justify-between mb-1">
      <label htmlFor={id} className="block dark:text-slate-400 font-medium text-slate-500 text-xs">
        {label}
      </label>
      <span className="dark:text-slate-400 font-mono text-slate-500 text-xs">
        {formatValue(value)}
      </span>
    </div>
    <div className="-m-1 p-1 rounded-lg">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={formatValue(value)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="accent-teal-700 cursor-pointer dark:accent-teal-500 rounded-lg w-full"
      />
    </div>
  </div>
);
